package com.aakashreddy.holeyshapes

import android.graphics.Matrix
import android.graphics.Path
import android.graphics.RectF
import java.util.concurrent.ConcurrentHashMap

internal data class Hole(
    val cx: Double,
    val cy: Double,
    val rx: Double,
    val ry: Double,
    val rotation: Double = 0.0,
)

private fun h(cx: Int, cy: Int, rx: Int, ry: Int, rotation: Int = 0) =
    Hole(cx.toDouble(), cy.toDouble(), rx.toDouble(), ry.toDouble(), rotation.toDouble())

internal val HoleyShape.templates: List<Hole>
    get() = when (this) {
        HoleyShape.Disc -> listOf(h(138,112,19,27,-24),h(247,95,24,16,12),h(310,178,17,25,25),h(285,280,20,29,32),h(166,312,25,17,8),h(93,225,16,24,-8),h(196,177,18,25,18),h(245,224,22,15,-18),h(145,236,16,21,30),h(211,285,15,20,-12),h(293,231,13,18,10),h(108,169,13,18,22))
        HoleyShape.RoundBlock -> listOf(h(123,116,23,17,-16),h(211,105,16,23,5),h(300,125,22,16,16),h(101,207,16,23,-4),h(190,190,23,16,22),h(292,211,17,25,12),h(125,300,22,16,-18),h(218,293,16,23),h(306,295,21,15,13),h(153,158,13,18,21),h(249,151,15,20,-14),h(245,246,13,18,8))
        HoleyShape.Hex -> listOf(h(207,91,15,22),h(287,140,23,15,18),h(314,226,16,23,8),h(260,304,18,25,24),h(157,305,23,16,-15),h(101,229,16,23,-8),h(123,146,17,24,16),h(204,162,20,14,-12),h(244,231,16,22,22),h(159,237,20,14,9),h(210,274,12,17,-5))
        HoleyShape.Capsule -> listOf(h(91,205,15,23),h(150,164,23,15,-12),h(218,211,16,24,8),h(291,165,21,15,10),h(335,222,15,22,-8),h(145,252,21,14,17),h(262,260,22,15,-14),h(206,154,12,17,5))
        HoleyShape.Prism -> listOf(h(145,129,20,15,-18),h(244,108,15,21,10),h(309,173,20,15,20),h(284,270,16,23,17),h(211,317,22,15),h(130,278,16,22,-18),h(100,188,20,15,-12),h(197,186,15,22,8),h(237,245,20,14,18),h(151,218,13,18,-5))
        HoleyShape.Cross -> listOf(h(210,86,15,22),h(210,135,13,18),h(327,210,22,15),h(278,210,18,13),h(210,334,15,22),h(210,285,13,18),h(91,210,22,15),h(140,210,18,13),h(210,210,21,21))
        HoleyShape.Triangle -> listOf(h(210,103,14,20),h(170,170,18,13,-15),h(252,172,18,13,15),h(127,257,16,22,-10),h(210,248,21,15),h(294,257,16,22,10),h(89,323,18,13),h(210,319,17,12),h(330,323,18,13))
        HoleyShape.Diamond -> listOf(h(210,83,16,22),h(142,142,20,14,-18),h(278,142,20,14,18),h(85,210,15,21),h(210,210,22,16),h(335,210,15,21),h(143,279,20,14,18),h(277,279,20,14,-18),h(210,337,16,22),h(210,145,12,17))
        HoleyShape.Sunburst -> listOf(h(210,91,16,22),h(143,126,19,14,-18),h(278,126,19,14,18),h(103,197,15,22),h(210,183,21,15),h(317,197,15,22),h(112,291,18,24,-8),h(210,278,22,15),h(307,291,18,24,8),h(162,224,12,17,15))
        HoleyShape.Octagon -> listOf(h(137,96,19,14,-15),h(229,87,14,20),h(313,131,19,14,18),h(328,221,14,20),h(298,310,19,14,-18),h(207,332,14,20),h(116,306,19,14,15),h(82,216,14,20),h(119,153,14,19,-8),h(208,164,20,14,12),h(271,231,15,21,18),h(171,257,20,14,-14))
        HoleyShape.Chevron -> listOf(h(102,126,19,14,18),h(162,161,15,21,-12),h(258,160,15,21,12),h(319,126,19,14,-18),h(210,223,21,15),h(161,264,16,22,18),h(210,308,19,13),h(260,264,16,22,-18))
        HoleyShape.LongBar -> listOf(h(146,91,20,14,-12),h(255,88,15,21,8),h(103,170,14,20),h(201,158,21,15,15),h(305,172,15,22,-8),h(137,246,18,25,12),h(245,238,21,15,-12),h(306,299,17,23,8),h(185,324,22,15),h(272,130,12,17,15))
        HoleyShape.FlowerStar, HoleyShape.Flower -> listOf(h(210,104,18,24),h(304,174,23,17,20),h(269,282,18,24,-22),h(151,282,22,17,18),h(116,174,17,23,-18),h(210,210,23,18),h(254,211,16,21,12),h(168,210,16,21,-12))
        HoleyShape.Bowtie -> listOf(h(98,126,20,15,-15),h(190,116,16,22,8),h(322,126,20,15,15),h(322,294,20,15,-15),h(230,304,16,22,-8),h(98,294,20,15,15),h(176,210,15,20),h(244,210,15,20))
    }

internal object ShapeGeometry {
    private val bodyPaths = ConcurrentHashMap<HoleyShape, Path>()

    fun bodyPath(shape: HoleyShape): Path = bodyPaths.getOrPut(shape) { makeBodyPath(shape) }

    fun punchedPath(shape: HoleyShape, holes: List<Hole>): Path {
        val result = Path(bodyPath(shape))
        if (holes.isEmpty()) return result

        val holePath = Path()
        holes.forEach { hole ->
            val ellipse = Path().apply {
                addOval(RectF(
                    (hole.cx - hole.rx).toFloat(),
                    (hole.cy - hole.ry).toFloat(),
                    (hole.cx + hole.rx).toFloat(),
                    (hole.cy + hole.ry).toFloat(),
                ), Path.Direction.CW)
            }
            if (hole.rotation != 0.0) {
                ellipse.transform(Matrix().apply {
                    setRotate(hole.rotation.toFloat(), hole.cx.toFloat(), hole.cy.toFloat())
                })
            }
            holePath.addPath(ellipse)
        }
        result.op(holePath, Path.Op.DIFFERENCE)
        return result
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
        HoleyShape.Flower -> flower()
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

    private fun flower() = Path().apply {
        addOval(RectF(105f, 105f, 315f, 315f), Path.Direction.CW)
        addEllipse(210f, 110f, 60f, 90f)
        addEllipse(296.6f, 160f, 60f, 90f, 60f)
        addEllipse(296.6f, 260f, 60f, 90f, 120f)
        addEllipse(210f, 310f, 60f, 90f)
        addEllipse(123.4f, 260f, 60f, 90f, 60f)
        addEllipse(123.4f, 160f, 60f, 90f, 120f)
    }

    private fun Path.addEllipse(cx: Float, cy: Float, rx: Float, ry: Float, rotation: Float = 0f) {
        val ellipse = Path().apply {
            addOval(RectF(cx - rx, cy - ry, cx + rx, cy + ry), Path.Direction.CW)
        }
        if (rotation != 0f) {
            ellipse.transform(Matrix().apply { setRotate(rotation, cx, cy) })
        }
        addPath(ellipse)
    }

    private fun polygon(vararg points: Pair<Float, Float>) = Path().apply {
        val first = points.first()
        moveTo(first.first, first.second)
        points.drop(1).forEach { (x, y) -> lineTo(x, y) }
        close()
    }
}
