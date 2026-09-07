package com.aakashreddy.holeyshapes.core

import kotlin.math.*

// Equal-area ellipses with a 12-unit separating gap and sampled outer rim.
internal object HoleOptimization {
    private data class Point(val x: Double, val y: Double)
    private data class Edge(val x: Double, val y: Double, val nx: Double, val ny: Double)
    private data class Profile(val a: Double, val b: Double, val support: List<Double>, val edge: List<Edge>)
    private val directions = List(48) { i -> Point(cos(i * PI * 2 / 48), sin(i * PI * 2 / 48)) }

    private val perimeterDirections = List(192) { i -> Point(cos(i * PI * 2 / 192), sin(i * PI * 2 / 192)) }

    fun maximize(shape: HoleyShape, holes: List<Hole>): List<Hole> {
        if (holes.isEmpty()) return holes
        val containment = ShapeContainment.path(shape)
        val gap = 12.0
        val profiles = holes.map { hole ->
            val a = sqrt(hole.rx / hole.ry)
            val b = 1 / a
            val angle = hole.rotation * PI / 180
            val c = cos(angle)
            val s = sin(angle)
            val support = directions.map { n -> hypot(a * (n.x * c + n.y * s), b * (-n.x * s + n.y * c)) }
            val edge = perimeterDirections.map { n ->
                val nx = n.x / a
                val ny = n.y / b
                val length = hypot(nx, ny)
                Edge(a * n.x * c - b * n.y * s, a * n.x * s + b * n.y * c,
                    (nx * c - ny * s) / length, (nx * s + ny * c) / length)
            }
            Profile(a, b, support, edge)
        }
        val points = holes.map { Point(it.cx, it.cy) }.toMutableList()
        fun boundaryLimit(point: Point, profile: Profile): Double {
            if (!containment.contains(point.x, point.y)) return 0.0
            var low = 0.0
            var high = 180.0
            repeat(11) {
                val radius = (low + high) / 2
                // An extra rim unit covers the space between perimeter samples.
                val fits = profile.edge.all { e -> containment.contains(
                    point.x + radius * e.x + (gap + 1) * e.nx, point.y + radius * e.y + (gap + 1) * e.ny) }
                if (fits) low = radius else high = radius
            }
            return low
        }
        val boundaries = points.mapIndexed { i, p -> boundaryLimit(p, profiles[i]) }.toMutableList()
        fun capacity(point: Point, index: Int, boundary: Double): Double {
            var limit = boundary
            points.forEachIndexed { j, other ->
                if (j != index) {
                    var separation = 0.0
                    directions.forEachIndexed { k, n ->
                        val projection = abs((point.x - other.x) * n.x + (point.y - other.y) * n.y)
                        separation = max(separation, (projection - gap) / (profiles[index].support[k] + profiles[j].support[k]))
                    }
                    limit = min(limit, separation)
                }
            }
            return limit
        }
        val moves = listOf(1 to 0, -1 to 0, 0 to 1, 0 to -1, 1 to 1, -1 to 1, 1 to -1, -1 to -1)
        for (step in listOf(12.0, 6.0, 3.0, 1.5)) {
            for (pass in 0..<3) {
                var moved = false
                for (i in points.indices) {
                    val point = points[i]
                    var best = point
                    var bestBoundary = boundaries[i]
                    var bestLimit = capacity(point, i, bestBoundary)
                    for ((dx, dy) in moves) {
                        val candidate = Point(point.x + dx * step, point.y + dy * step)
                        val boundary = boundaryLimit(candidate, profiles[i])
                        val limit = capacity(candidate, i, boundary)
                        if (limit > bestLimit + 0.02) {
                            best = candidate; bestBoundary = boundary; bestLimit = limit
                        }
                    }
                    if (best != point) moved = true
                    points[i] = best; boundaries[i] = bestBoundary
                }
                if (!moved) break
            }
        }
        val radius = max(0.0, points.indices.minOf { capacity(points[it], it, boundaries[it]) } - 0.05)
        return holes.mapIndexed { i, hole -> hole.copy(cx = points[i].x, cy = points[i].y,
            rx = radius * profiles[i].a, ry = radius * profiles[i].b) }
    }
}
