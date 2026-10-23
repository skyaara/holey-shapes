package com.aakashreddy.holeyshapes.core

import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.math.*

// Equal-area ellipses with a 12-unit separating gap and sampled outer rim.
internal object HoleOptimization {
    private const val DIRECTIONS = 48
    private const val PERIMETER = 192
    private const val GAP = 12.0
    private const val RIM = GAP + 1

    private class Profile(
        val a: Double,
        val b: Double,
        val support: DoubleArray,
        val edgeX: DoubleArray,
        val edgeY: DoubleArray,
        val edgeNx: DoubleArray,
        val edgeNy: DoubleArray,
    )

    private val directionX = DoubleArray(DIRECTIONS) { i -> cos(i * PI * 2 / DIRECTIONS) }
    private val directionY = DoubleArray(DIRECTIONS) { i -> sin(i * PI * 2 / DIRECTIONS) }
    private val perimeterX = DoubleArray(PERIMETER) { i -> cos(i * PI * 2 / PERIMETER) }
    private val perimeterY = DoubleArray(PERIMETER) { i -> sin(i * PI * 2 / PERIMETER) }
    private val moveX = intArrayOf(1, -1, 0, 0, 1, -1, 1, -1)
    private val moveY = intArrayOf(0, 0, 1, -1, 1, 1, -1, -1)
    private val steps = doubleArrayOf(12.0, 6.0, 3.0, 1.5)

    private fun profile(hole: Hole): Profile {
        val a = sqrt(hole.rx / hole.ry)
        val b = 1 / a
        val angle = hole.rotation * PI / 180
        val c = cos(angle)
        val s = sin(angle)
        val support = DoubleArray(DIRECTIONS) { k ->
            val nx = directionX[k]
            val ny = directionY[k]
            hypot(a * (nx * c + ny * s), b * (-nx * s + ny * c))
        }
        val edgeX = DoubleArray(PERIMETER)
        val edgeY = DoubleArray(PERIMETER)
        val edgeNx = DoubleArray(PERIMETER)
        val edgeNy = DoubleArray(PERIMETER)
        for (k in 0..<PERIMETER) {
            val px = perimeterX[k]
            val py = perimeterY[k]
            val nx = px / a
            val ny = py / b
            val length = hypot(nx, ny)
            edgeX[k] = a * px * c - b * py * s
            edgeY[k] = a * px * s + b * py * c
            edgeNx[k] = (nx * c - ny * s) / length
            edgeNy[k] = (nx * s + ny * c) / length
        }
        return Profile(a, b, support, edgeX, edgeY, edgeNx, edgeNy)
    }

    /** Matches JavaScript `Number(value.toFixed(3))`, which rounds the exact binary value half-up. */
    internal fun roundTo3(value: Double): Double =
        if (value.isFinite()) BigDecimal(value).setScale(3, RoundingMode.HALF_UP).toDouble() else value

    fun maximize(shape: HoleyShape, holes: List<Hole>): List<Hole> {
        if (holes.isEmpty()) return holes
        val containment = ShapeContainment.path(shape)
        val count = holes.size
        val profiles = Array(count) { profile(holes[it]) }
        val pointX = DoubleArray(count) { holes[it].cx }
        val pointY = DoubleArray(count) { holes[it].cy }

        // An extra rim unit covers the space between perimeter samples.
        fun rimFits(x: Double, y: Double, profile: Profile, radius: Double): Boolean {
            val ex = profile.edgeX
            val ey = profile.edgeY
            val enx = profile.edgeNx
            val eny = profile.edgeNy
            for (k in 0..<PERIMETER) {
                if (!containment.contains(x + radius * ex[k] + RIM * enx[k], y + radius * ey[k] + RIM * eny[k])) {
                    return false
                }
            }
            return true
        }

        fun boundaryLimit(x: Double, y: Double, profile: Profile): Double {
            if (!containment.contains(x, y)) return 0.0
            var low = 0.0
            var high = 180.0
            repeat(11) {
                val radius = (low + high) / 2
                if (rimFits(x, y, profile, radius)) low = radius else high = radius
            }
            return low
        }

        fun fitsAt(x: Double, y: Double, profile: Profile, radius: Double): Boolean =
            radius < 180 && containment.contains(x, y) && rimFits(x, y, profile, radius)

        fun capacity(x: Double, y: Double, index: Int, boundary: Double): Double {
            var limit = boundary
            val own = profiles[index].support
            for (j in 0..<count) {
                if (j == index) continue
                val other = profiles[j].support
                val ox = x - pointX[j]
                val oy = y - pointY[j]
                var separation = 0.0
                for (k in 0..<DIRECTIONS) {
                    val projection = abs(ox * directionX[k] + oy * directionY[k])
                    separation = max(separation, (projection - GAP) / (own[k] + other[k]))
                }
                limit = min(limit, separation)
            }
            return limit
        }

        val boundaries = DoubleArray(count) { boundaryLimit(pointX[it], pointY[it], profiles[it]) }
        for (step in steps) {
            for (pass in 0..<3) {
                var moved = false
                for (i in 0..<count) {
                    val x = pointX[i]
                    val y = pointY[i]
                    val profile = profiles[i]
                    var bestX = x
                    var bestY = y
                    var bestBoundary = boundaries[i]
                    var bestLimit = capacity(x, y, i, bestBoundary)
                    var improved = false
                    for (m in 0..<8) {
                        val cx = x + moveX[m] * step
                        val cy = y + moveY[m] * step
                        // A move wins only if both limits beat the threshold, so reject on the cheap
                        // separation test and a single rim test before the boundary search.
                        val threshold = bestLimit + 0.02
                        val separation = capacity(cx, cy, i, Double.POSITIVE_INFINITY)
                        if (separation <= threshold || !fitsAt(cx, cy, profile, threshold)) continue
                        val boundary = boundaryLimit(cx, cy, profile)
                        val limit = min(separation, boundary)
                        if (limit > threshold) {
                            bestX = cx; bestY = cy; bestBoundary = boundary; bestLimit = limit
                            improved = true
                        }
                    }
                    if (improved) moved = true
                    pointX[i] = bestX; pointY[i] = bestY; boundaries[i] = bestBoundary
                }
                if (!moved) break
            }
        }
        var smallest = Double.POSITIVE_INFINITY
        for (i in 0..<count) smallest = min(smallest, capacity(pointX[i], pointY[i], i, boundaries[i]))
        val radius = max(0.0, smallest - 0.05)
        return holes.mapIndexed { i, hole -> hole.copy(cx = pointX[i], cy = pointY[i],
            rx = roundTo3(radius * profiles[i].a), ry = roundTo3(radius * profiles[i].b)) }
    }
}
