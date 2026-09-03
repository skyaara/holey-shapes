package com.aakashreddy.holeyshapes

import android.graphics.Matrix
import android.graphics.Path
import android.graphics.Region
import android.util.LruCache
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

private data class Candidate(val x: Double, val y: Double, val clearance: Double)
private data class LayoutKey(val shape: HoleyShape, val count: Int, val seed: Int)

private class ShapeContainment(path: Path) {
    private val scale = 8f
    private val region = Region().apply {
        val scaledPath = Path(path).apply {
            transform(Matrix().apply { setScale(scale, scale) })
        }
        setPath(scaledPath, Region(0, 0, (420 * scale).toInt(), (420 * scale).toInt()))
    }

    fun contains(x: Double, y: Double): Boolean =
        region.contains((x * scale).roundToInt(), (y * scale).roundToInt())
}

internal object HolePacking {
    private val candidateCache = ConcurrentHashMap<HoleyShape, List<Candidate>>()
    private val layoutCache = LruCache<LayoutKey, List<Hole>>(512)

    fun layout(shape: HoleyShape, count: Int, seed: Int): List<Hole> {
        val key = LayoutKey(shape, count, seed)
        synchronized(layoutCache) {
            layoutCache.get(key)?.let { return it }
        }

        val value = makeLayout(shape, count, seed)
        synchronized(layoutCache) {
            layoutCache.put(key, value)
        }
        return value
    }

    private fun makeLayout(shape: HoleyShape, count: Int, seed: Int): List<Hole> {
        if (count <= 0) return emptyList()
        val candidates = candidates(shape)
        if (candidates.isEmpty()) {
            val templates = shape.templates
            val start = Math.floorMod(seed, templates.size)
            return List(count) { templates[(start + it) % templates.size] }
        }

        val maximumClearance = candidates.maxOf { it.clearance }
        val starterPool = candidates.filter { it.clearance >= maximumClearance * 0.72 }
        val first = if (seed == 0) {
            starterPool.minBy { hypot(it.x - 210, it.y - 210) }
        } else {
            val position = floor(seededNoise(seed.toDouble(), count.toDouble(), seed.toDouble()) * starterPool.size)
                .toInt()
                .coerceAtMost(starterPool.lastIndex)
            starterPool[position]
        }

        var selected = listOf(first)
        val remaining = candidates.toMutableList().apply { remove(first) }
        while (selected.size < count && remaining.isNotEmpty()) {
            var bestIndex = 0
            var bestScore = Double.NEGATIVE_INFINITY
            remaining.forEachIndexed { index, candidate ->
                val nearest = selected.minOf { hypot(candidate.x - it.x, candidate.y - it.y) }
                val packingRadius = min(candidate.clearance - 12, nearest / 2 - 5)
                val variation = if (seed == 0) {
                    1.0
                } else {
                    0.92 + seededNoise(candidate.x, candidate.y, seed.toDouble()) * 0.16
                }
                val score = packingRadius * variation
                if (score > bestScore) {
                    bestScore = score
                    bestIndex = index
                }
            }
            selected = selected + remaining.removeAt(bestIndex)
        }

        repeat(8) {
            val cells = assignVoronoiCells(selected, candidates)
            selected = cells.mapIndexed { index, cell ->
                if (cell.isEmpty()) return@mapIndexed selected[index]
                val centroidX = cell.sumOf { it.x } / cell.size
                val centroidY = cell.sumOf { it.y } / cell.size
                cell.minBy { squaredDistance(it.x, it.y, centroidX, centroidY) }
            }
        }

        val cells = assignVoronoiCells(selected, candidates)
        val templates = shape.templates
        return selected.mapIndexed { index, point ->
            val nearest = if (selected.size == 1) {
                Double.POSITIVE_INFINITY
            } else {
                selected.indices
                    .filter { it != index }
                    .minOf { other -> hypot(point.x - selected[other].x, point.y - selected[other].y) }
            }
            val style = templates[Math.floorMod(index + seed, templates.size)]
            val styleRadius = max(style.rx, style.ry)
            val aspectArea = (style.rx / styleRadius) * (style.ry / styleRadius)
            val territoryArea = cells[index].size * 144.0
            val territoryRadius = sqrt((territoryArea * 0.56) / (PI * aspectArea))
            val safeRadius = min(point.clearance - 12, nearest / 2 - 6)
            val radius = max(10.0, min(safeRadius, territoryRadius))
            Hole(
                cx = point.x,
                cy = point.y,
                rx = round(radius * style.rx / styleRadius),
                ry = round(radius * style.ry / styleRadius),
                rotation = style.rotation,
            )
        }
    }

    private fun candidates(shape: HoleyShape): List<Candidate> = candidateCache.getOrPut(shape) {
        val path = ShapeGeometry.bodyPath(shape)
        val containment = ShapeContainment(path)
        buildList {
            for (y in 50..370 step 12) {
                for (x in 50..370 step 12) {
                    if (!containment.contains(x.toDouble(), y.toDouble())) continue
                    val clearance = boundaryClearance(containment, x.toDouble(), y.toDouble())
                    if (clearance >= 17) add(Candidate(x.toDouble(), y.toDouble(), clearance))
                }
            }
        }
    }

    private fun boundaryClearance(containment: ShapeContainment, cx: Double, cy: Double): Double {
        if (!containment.contains(cx, cy)) return 0.0
        var low = 0.0
        var high = 180.0
        repeat(9) {
            val radius = (low + high) / 2
            if (circleFits(containment, cx, cy, radius)) low = radius else high = radius
        }
        return low
    }

    private fun circleFits(containment: ShapeContainment, cx: Double, cy: Double, radius: Double): Boolean {
        repeat(32) { step ->
            val angle = PI * 2 * step / 32
            val x = cx + cos(angle) * radius
            val y = cy + sin(angle) * radius
            if (!containment.contains(x, y)) return false
        }
        return true
    }

    private fun assignVoronoiCells(
        points: List<Candidate>,
        candidates: List<Candidate>,
    ): List<List<Candidate>> {
        val cells = List(points.size) { mutableListOf<Candidate>() }
        candidates.forEach { candidate ->
            var closestIndex = 0
            var closestDistance = Double.POSITIVE_INFINITY
            points.forEachIndexed { index, point ->
                val distance = squaredDistance(candidate.x, candidate.y, point.x, point.y)
                if (distance < closestDistance) {
                    closestDistance = distance
                    closestIndex = index
                }
            }
            cells[closestIndex] += candidate
        }
        return cells
    }

    private fun seededNoise(x: Double, y: Double, seed: Double): Double {
        val value = sin(x * 12.9898 + y * 78.233 + seed * 41.137) * 43_758.5453
        return value - floor(value)
    }

    private fun squaredDistance(x1: Double, y1: Double, x2: Double, y2: Double): Double {
        val dx = x1 - x2
        val dy = y1 - y2
        return dx * dx + dy * dy
    }
}
