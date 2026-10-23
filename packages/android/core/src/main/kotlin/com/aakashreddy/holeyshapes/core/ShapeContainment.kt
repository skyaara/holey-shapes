package com.aakashreddy.holeyshapes.core

import kotlin.math.*

// Pure geometry. Curved outlines are flattened within 0.01 viewBox units.
// Each band holds its edges flattened as consecutive (x, y, nx, ny) quadruples.
internal class ShapeContainment private constructor(private val minBand: Int, private val bands: Array<DoubleArray>) {
    private data class Edge(val x: Double, val y: Double, val nx: Double, val ny: Double)
    fun contains(x: Double, y: Double): Boolean {
        val index = floor(y / 8).toInt() - minBand
        if (index < 0 || index >= bands.size) return false
        val edges = bands[index]
        var winding = 0
        var k = 0
        while (k < edges.size) {
            val ex = edges[k]
            val ey = edges[k + 1]
            val enx = edges[k + 2]
            val eny = edges[k + 3]
            k += 4
            if ((ey > y) == (eny > y)) continue
            if (x < ex + (y - ey) * (enx - ex) / (eny - ey)) winding += if (eny > ey) 1 else -1
        }
        return winding != 0
    }
    private class Builder {
        var x = 0.0; var y = 0.0; var sx = 0.0; var sy = 0.0
        val bands = mutableMapOf<Int, MutableList<Edge>>()
        fun move(x: Double, y: Double) { this.x = x; this.y = y; sx = x; sy = y }
        fun line(nx: Double, ny: Double) {
            if (y != ny) {
                val edge = Edge(x, y, nx, ny)
                for (band in floor(min(y, ny) / 8).toInt()..floor(max(y, ny) / 8).toInt()) {
                    bands.getOrPut(band) { mutableListOf() }.add(edge)
                }
            }
            x = nx; y = ny
        }
        fun close() = line(sx, sy)
        fun quad(cx: Double, cy: Double, nx: Double, ny: Double) {
            if (hypot(cx - (x + nx) / 2, cy - (y + ny) / 2) <= 0.02) { line(nx, ny); return }
            val ax = (x + cx) / 2; val ay = (y + cy) / 2
            val bx = (cx + nx) / 2; val by = (cy + ny) / 2
            val mx = (ax + bx) / 2; val my = (ay + by) / 2
            quad(ax, ay, mx, my); quad(bx, by, nx, ny)
        }
        // SVG `A` command with zero x-axis rotation, flattened exactly like the
        // JavaScript package so hit-testing (and therefore layouts) match.
        fun arc(radiusX: Double, radiusY: Double, large: Boolean, sweep: Boolean, nx: Double, ny: Double) {
            var rx = abs(radiusX); var ry = abs(radiusY)
            if (rx == 0.0 || ry == 0.0) { line(nx, ny); return }
            if (x == nx && y == ny) return
            val px = (x - nx) / 2; val py = (y - ny) / 2
            val scale = hypot(px / rx, py / ry)
            if (scale > 1) { rx *= scale; ry *= scale }
            val factor = (if (large == sweep) -1.0 else 1.0) * sqrt(max(0.0,
                (rx * rx * ry * ry - rx * rx * py * py - ry * ry * px * px) /
                    (rx * rx * py * py + ry * ry * px * px)))
            val cx = factor * rx * py / ry; val cy = -factor * ry * px / rx
            val centerX = cx + (x + nx) / 2; val centerY = cy + (y + ny) / 2
            val angle = atan2((py - cy) / ry, (px - cx) / rx)
            var delta = atan2((-py - cy) / ry, (-px - cx) / rx) - angle
            if (sweep && delta < 0) delta += PI * 2
            if (!sweep && delta > 0) delta -= PI * 2
            val steps = ceil(abs(delta) / (2 * acos(1 - min(1.0, 0.01 / max(rx, ry))))).toInt()
            for (step in 1 until steps) {
                val a = angle + delta * step / steps
                line(centerX + rx * cos(a), centerY + ry * sin(a))
            }
            line(nx, ny)
        }
        fun disc() {
            move(210.0, 38.0); arc(164.0, 164.0, large = true, sweep = true, nx = 209.9, ny = 38.0); close()
        }
        fun capsule() {
            move(129.0, 112.0); line(291.0, 112.0)
            arc(95.0, 95.0, large = false, sweep = true, nx = 291.0, ny = 302.0); line(129.0, 302.0)
            arc(95.0, 95.0, large = false, sweep = true, nx = 129.0, ny = 112.0); close()
        }
    }
    companion object {
        private val paths = HoleyShape.entries.associateWith { make(it) }
        fun path(shape: HoleyShape): ShapeContainment = paths.getValue(shape)
        private fun make(shape: HoleyShape): ShapeContainment {
            val b = Builder()
            when (shape) {
            HoleyShape.Disc -> {
                b.disc()
            }
            HoleyShape.RoundBlock -> {
                b.move(121.0, 54.0)
                b.line(299.0, 54.0)
                b.quad(365.0, 54.0, 365.0, 120.0)
                b.line(365.0, 298.0)
                b.quad(365.0, 364.0, 299.0, 364.0)
                b.line(121.0, 364.0)
                b.quad(55.0, 364.0, 55.0, 298.0)
                b.line(55.0, 120.0)
                b.quad(55.0, 54.0, 121.0, 54.0)
                b.close()
            }
            HoleyShape.Hex -> {
                b.move(210.0, 36.0)
                b.line(353.0, 119.0)
                b.line(353.0, 285.0)
                b.line(210.0, 368.0)
                b.line(67.0, 285.0)
                b.line(67.0, 119.0)
                b.close()
            }
            HoleyShape.Capsule -> {
                b.capsule()
            }
            HoleyShape.Prism -> {
                b.move(210.0, 34.0)
                b.line(370.0, 164.0)
                b.line(309.0, 358.0)
                b.line(111.0, 358.0)
                b.line(50.0, 164.0)
                b.close()
            }
            HoleyShape.Cross -> {
                b.move(151.0, 36.0)
                b.line(269.0, 36.0)
                b.line(269.0, 151.0)
                b.line(384.0, 151.0)
                b.line(384.0, 269.0)
                b.line(269.0, 269.0)
                b.line(269.0, 384.0)
                b.line(151.0, 384.0)
                b.line(151.0, 269.0)
                b.line(36.0, 269.0)
                b.line(36.0, 151.0)
                b.line(151.0, 151.0)
                b.close()
            }
            HoleyShape.Triangle -> {
                b.move(210.0, 38.0)
                b.line(382.0, 356.0)
                b.line(38.0, 356.0)
                b.close()
            }
            HoleyShape.Diamond -> {
                b.move(210.0, 28.0)
                b.line(392.0, 210.0)
                b.line(210.0, 392.0)
                b.line(28.0, 210.0)
                b.close()
            }
            HoleyShape.Sunburst -> {
                b.move(210.0, 28.0)
                b.line(246.0, 78.0)
                b.line(306.0, 50.0)
                b.line(315.0, 112.0)
                b.line(379.0, 113.0)
                b.line(352.0, 171.0)
                b.line(402.0, 208.0)
                b.line(349.0, 244.0)
                b.line(377.0, 303.0)
                b.line(313.0, 304.0)
                b.line(302.0, 368.0)
                b.line(245.0, 338.0)
                b.line(207.0, 390.0)
                b.line(171.0, 339.0)
                b.line(110.0, 368.0)
                b.line(105.0, 304.0)
                b.line(41.0, 300.0)
                b.line(69.0, 243.0)
                b.line(18.0, 207.0)
                b.line(71.0, 172.0)
                b.line(43.0, 112.0)
                b.line(107.0, 111.0)
                b.line(118.0, 49.0)
                b.line(173.0, 78.0)
                b.close()
            }
            HoleyShape.Octagon -> {
                b.move(130.0, 40.0)
                b.line(290.0, 40.0)
                b.line(380.0, 130.0)
                b.line(380.0, 290.0)
                b.line(290.0, 380.0)
                b.line(130.0, 380.0)
                b.line(40.0, 290.0)
                b.line(40.0, 130.0)
                b.close()
            }
            HoleyShape.Chevron -> {
                b.move(48.0, 76.0)
                b.line(210.0, 181.0)
                b.line(372.0, 76.0)
                b.line(398.0, 150.0)
                b.line(210.0, 353.0)
                b.line(22.0, 150.0)
                b.close()
            }
            HoleyShape.LongBar -> {
                b.move(30.0, 145.0)
                b.line(390.0, 145.0)
                b.line(390.0, 275.0)
                b.line(30.0, 275.0)
                b.close()
            }
            HoleyShape.FlowerStar -> {
                b.move(274.7, 121.0)
                b.quad(467.8, 126.3, 314.6, 244.0)
                b.quad(369.3, 429.2, 210.0, 320.0)
                b.quad(50.7, 429.2, 105.4, 244.0)
                b.quad(-47.8, 126.3, 145.3, 121.0)
                b.quad(210.0, -61.0, 274.7, 121.0)
                b.close()
            }
            HoleyShape.Bowtie -> {
                b.move(40.0, 70.0)
                b.line(380.0, 70.0)
                b.line(286.0, 210.0)
                b.line(380.0, 350.0)
                b.line(40.0, 350.0)
                b.line(134.0, 210.0)
                b.close()
            }
            }
            val minBand = b.bands.keys.minOrNull() ?: 0
            val maxBand = b.bands.keys.maxOrNull() ?: -1
            val bands = Array(maxBand - minBand + 1) { offset ->
                val edges = b.bands[minBand + offset].orEmpty()
                DoubleArray(edges.size * 4).also { flat ->
                    edges.forEachIndexed { i, e ->
                        flat[i * 4] = e.x; flat[i * 4 + 1] = e.y; flat[i * 4 + 2] = e.nx; flat[i * 4 + 3] = e.ny
                    }
                }
            }
            return ShapeContainment(minBand, bands)
        }
    }
}
