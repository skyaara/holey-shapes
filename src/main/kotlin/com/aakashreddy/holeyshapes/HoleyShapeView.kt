package com.aakashreddy.holeyshapes

import android.graphics.Paint
import android.graphics.Path
import android.util.LruCache
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import kotlin.math.PI
import kotlin.math.sin

private data class RenderKey(val shape: HoleyShape, val holes: Int, val seed: Int)

private object RenderPathCache {
    private val paths = LruCache<RenderKey, Path>(512)

    fun path(shape: HoleyShape, holes: Int, seed: Int): Path {
        val key = RenderKey(shape, holes, seed)
        synchronized(paths) {
            paths.get(key)?.let { return it }
        }
        val value = ShapeGeometry.punchedPath(shape, HolePacking.layout(shape, holes, seed))
        synchronized(paths) {
            paths.put(key, value)
        }
        return value
    }
}

/**
 * Draws a catalog shape with deterministic holes and solid extrusion.
 *
 * Hovering closes and reopens each hole in a deterministic shuffled order while the body stays
 * still. Android's system animation scale applies automatically. Set [HoleyShapeConfig.animated]
 * to false for a static mark.
 */
@Composable
fun HoleyShapeView(
    config: HoleyShapeConfig,
    modifier: Modifier = Modifier,
    contentDescription: String? = "${config.shape.displayName} with ${config.holes} holes",
) {
    val options = remember(config) { config.normalized() }
    val holes = remember(options.shape, options.holes, options.seed) {
        HolePacking.layout(options.shape, options.holes, options.seed)
    }
    val staticPath = remember(options.shape, options.holes, options.seed) {
        RenderPathCache.path(options.shape, options.holes, options.seed)
    }
    val interactionSource = remember { MutableInteractionSource() }
    val hovered by interactionSource.collectIsHoveredAsState()
    val holeProgress = remember { Animatable(1f) }
    val facePaint = remember(options.faceColor) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = options.faceColor.toArgb() }
    }
    val shadowPaint = remember(options.shadowColor) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = options.shadowColor.toArgb() }
    }

    LaunchedEffect(hovered, options.shape, options.seed, options.animated, options.durationMillis) {
        holeProgress.snapTo(if (hovered && options.animated) 0f else 1f)
        if (hovered && options.animated) {
            holeProgress.animateTo(
                targetValue = 1f,
                animationSpec = tween(
                    durationMillis = options.durationMillis,
                    easing = CubicBezierEasing(0.33f, 0f, 0.2f, 1f),
                ),
            )
        }
    }

    val semanticsModifier = if (contentDescription == null) {
        Modifier
    } else {
        Modifier.semantics { this.contentDescription = contentDescription }
    }

    Canvas(
        modifier = modifier
            .then(semanticsModifier)
            .hoverable(interactionSource = interactionSource, enabled = options.animated),
    ) {
        val scale = size.minDimension / 420f
        val left = (size.width - size.minDimension) / 2f
        val top = (size.height - size.minDimension) / 2f
        val progress = holeProgress.value
        val path = if (progress >= 1f) {
            staticPath
        } else {
            ShapeGeometry.punchedPath(
                options.shape,
                holes.mapIndexed { index, hole ->
                    val holeScale = holeScale(options.seed, index, progress)
                    hole.copy(rx = hole.rx * holeScale, ry = hole.ry * holeScale)
                },
            )
        }

        drawIntoCanvas { canvas ->
            val nativeCanvas = canvas.nativeCanvas
            for (step in options.shadowSteps downTo 1) {
                val ratio = step.toFloat() / options.shadowSteps
                nativeCanvas.drawHoleyPath(
                    path = path,
                    paint = shadowPaint,
                    scale = scale,
                    x = left + options.shadowX * ratio * scale,
                    y = top + options.shadowY * ratio * scale,
                )
            }
            nativeCanvas.drawHoleyPath(path, facePaint, scale, left, top)
        }
    }
}

private fun holeScale(seed: Int, index: Int, progress: Float): Double {
    if (progress >= 1f) return 1.0
    val first = holeNoise(seed, index, 0)
    val second = holeNoise(seed, index, 1)
    val start = 0.04f + first * 0.34f
    val span = minOf(0.58f, 0.42f + second * 0.16f, 0.96f - start)
    val local = (progress - start) / span
    if (local <= 0f || local >= 1f) return 1.0
    val pulse = sin(local * PI)
    return 1.0 - 0.94 * pulse * pulse
}

private fun holeNoise(seed: Int, index: Int, salt: Int): Float {
    var value = seed.toLong()
    value += (index + 1).toLong() * -7_046_029_254_386_353_131L
    value += (salt + 1).toLong() * -4_658_895_280_553_007_687L
    value = (value xor (value ushr 30)) * -4_658_895_280_553_007_687L
    value = (value xor (value ushr 27)) * -7_723_592_293_110_705_685L
    value = value xor (value ushr 31)
    return (value and 0xFFFF).toFloat() / 0xFFFF
}

/** Convenience overload matching the web and Swift package options. */
@Composable
fun HoleyShapeView(
    modifier: Modifier = Modifier,
    shape: HoleyShape = HoleyShape.Disc,
    faceColor: Color = shape.color,
    shadowColor: Color = faceColor.darkened(),
    holes: Int = shape.defaultHoleCount,
    seed: Int = 0,
    animated: Boolean = true,
    durationMillis: Int = 900,
    shadowX: Float = 18f,
    shadowY: Float = 21f,
    shadowSteps: Int = 12,
    contentDescription: String? = "${shape.displayName} with $holes holes",
) {
    HoleyShapeView(
        config = HoleyShapeConfig(
            shape = shape,
            faceColor = faceColor,
            shadowColor = shadowColor,
            holes = holes,
            seed = seed,
            animated = animated,
            durationMillis = durationMillis,
            shadowX = shadowX,
            shadowY = shadowY,
            shadowSteps = shadowSteps,
        ),
        modifier = modifier,
        contentDescription = contentDescription,
    )
}

private fun android.graphics.Canvas.drawHoleyPath(
    path: Path,
    paint: Paint,
    scale: Float,
    x: Float,
    y: Float,
) {
    save()
    translate(x, y)
    scale(scale, scale)
    drawPath(path, paint)
    restore()
}
