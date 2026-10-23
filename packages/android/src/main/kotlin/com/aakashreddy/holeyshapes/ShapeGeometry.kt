package com.aakashreddy.holeyshapes

import android.graphics.Matrix
import android.graphics.Path
import android.graphics.RectF
import java.util.concurrent.ConcurrentHashMap

internal object ShapeGeometry {
    private val bodyPaths = ConcurrentHashMap<HoleyShape, Path>()

    // Shared body paths must never be mutated; callers copy them with addPath.
    fun bodyPath(shape: HoleyShape): Path = bodyPaths.getOrPut(shape) { makeBodyPath(shape) }

    /** A new path containing [shape]'s body with [holes] punched out at full size. */
    fun punchedPath(shape: HoleyShape, holes: List<Hole>): Path =
        Path().also { PunchedPathBuilder().build(it, shape, holes, null) }

    /**
     * Writes body plus hole ellipses into a target path, reusing scratch objects across frames.
     *
     * Holes are disjoint and kept at least 12 units inside simple (non-self-intersecting) body
     * outlines, so even-odd filling punches them out without a per-frame boolean path op.
     */
    class PunchedPathBuilder {
        private val oval = Path()
        private val rect = RectF()
        private val matrix = Matrix()

        fun build(target: Path, shape: HoleyShape, holes: List<Hole>, scales: FloatArray?) {
            target.rewind()
            target.addPath(bodyPath(shape))
            target.fillType = Path.FillType.EVEN_ODD
            for (index in holes.indices) {
                val hole = holes[index]
                val scale = if (scales == null) 1.0 else scales[index].toDouble()
                val rx = hole.rx * scale
                val ry = hole.ry * scale
                rect.set((hole.cx - rx).toFloat(), (hole.cy - ry).toFloat(), (hole.cx + rx).toFloat(), (hole.cy + ry).toFloat())
                if (hole.rotation == 0.0) {
                    target.addOval(rect, Path.Direction.CW)
                } else {
                    oval.rewind()
                    oval.addOval(rect, Path.Direction.CW)
                    matrix.setRotate(hole.rotation.toFloat(), hole.cx.toFloat(), hole.cy.toFloat())
                    target.addPath(oval, matrix)
                }
            }
        }
    }

    private fun makeBodyPath(shape: HoleyShape): Path = when (shape) {
        HoleyShape.Disc -> Path().apply {
            addOval(RectF(46f, 38f, 374f, 366f), Path.Direction.CW)
        }
        HoleyShape.RoundBlock -> Path().apply {
            moveTo(121f, 54f)
            lineTo(299f, 54f)
            quadTo(365f, 54f, 365f, 120f)
            lineTo(365f, 298f)
            quadTo(365f, 364f, 299f, 364f)
            lineTo(121f, 364f)
            quadTo(55f, 364f, 55f, 298f)
            lineTo(55f, 120f)
            quadTo(55f, 54f, 121f, 54f)
            close()
        }
        HoleyShape.Hex -> polygon(210f to 36f,353f to 119f,353f to 285f,210f to 368f,67f to 285f,67f to 119f)
        HoleyShape.Capsule -> Path().apply {
            addRoundRect(RectF(34f, 112f, 386f, 302f), 95f, 95f, Path.Direction.CW)
        }
        HoleyShape.Prism -> polygon(210f to 34f,370f to 164f,309f to 358f,111f to 358f,50f to 164f)
        HoleyShape.Cross -> polygon(151f to 36f,269f to 36f,269f to 151f,384f to 151f,384f to 269f,269f to 269f,269f to 384f,151f to 384f,151f to 269f,36f to 269f,36f to 151f,151f to 151f)
        HoleyShape.Triangle -> polygon(210f to 38f,382f to 356f,38f to 356f)
        HoleyShape.Diamond -> polygon(210f to 28f,392f to 210f,210f to 392f,28f to 210f)
        HoleyShape.Sunburst -> polygon(210f to 28f,246f to 78f,306f to 50f,315f to 112f,379f to 113f,352f to 171f,402f to 208f,349f to 244f,377f to 303f,313f to 304f,302f to 368f,245f to 338f,207f to 390f,171f to 339f,110f to 368f,105f to 304f,41f to 300f,69f to 243f,18f to 207f,71f to 172f,43f to 112f,107f to 111f,118f to 49f,173f to 78f)
        HoleyShape.Octagon -> polygon(130f to 40f,290f to 40f,380f to 130f,380f to 290f,290f to 380f,130f to 380f,40f to 290f,40f to 130f)
        HoleyShape.Chevron -> polygon(48f to 76f,210f to 181f,372f to 76f,398f to 150f,210f to 353f,22f to 150f)
        HoleyShape.LongBar -> polygon(30f to 145f,390f to 145f,390f to 275f,30f to 275f)
        HoleyShape.FlowerStar -> flowerStar()
        HoleyShape.Bowtie -> polygon(40f to 70f,380f to 70f,286f to 210f,380f to 350f,40f to 350f,134f to 210f)
    }

    private fun flowerStar() = Path().apply {
        moveTo(274.7f, 121f)
        quadTo(467.8f, 126.3f, 314.6f, 244f)
        quadTo(369.3f, 429.2f, 210f, 320f)
        quadTo(50.7f, 429.2f, 105.4f, 244f)
        quadTo(-47.8f, 126.3f, 145.3f, 121f)
        quadTo(210f, -61f, 274.7f, 121f)
        close()
    }

    private fun polygon(vararg points: Pair<Float, Float>) = Path().apply {
        val first = points.first()
        moveTo(first.first, first.second)
        points.drop(1).forEach { (x, y) -> lineTo(x, y) }
        close()
    }
}
