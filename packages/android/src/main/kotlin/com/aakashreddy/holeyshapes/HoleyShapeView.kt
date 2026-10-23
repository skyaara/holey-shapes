package com.aakashreddy.holeyshapes

import android.graphics.Paint
import android.graphics.Path
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.PointerType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.floor
import kotlin.math.sin

private data class LayoutRequest(val shape: HoleyShape, val holes: Int, val seed: Int)

private class PackedHoles(val request: LayoutRequest, val holes: List<Hole>)

/**
 * Draws a catalog shape with deterministic holes and solid extrusion.
 *
 * Hovering, or touching on devices without hover, closes and reopens each hole in a
 * deterministic shuffled order while the body stays still. Touches are observed without being
 * consumed, so parent click handlers still work. Android's system animation scale applies
 * automatically. Set [HoleyShapeConfig.animated] to false for a static mark.
 *
 * Holes are packed off the main thread; until they are ready the body and extrusion draw without
 * holes. Call [HoleyShapes.prewarm] ahead of time to have them on the first frame.
 */
@Composable
fun HoleyShapeView(
    config: HoleyShapeConfig,
    modifier: Modifier = Modifier,
    contentDescription: String? = config.defaultContentDescription(),
) {
    val options = remember(config) { config.normalized() }
    val request = LayoutRequest(options.shape, options.holes, options.seed)
    val cached = remember(request) { HolePacking.cachedLayout(request.shape, request.holes, request.seed) }
    val packed by produceState<PackedHoles?>(initialValue = null, request) {
        if (cached != null) return@produceState
        val holes = withContext(Dispatchers.Default) { HolePacking.layout(request.shape, request.holes, request.seed) }
        value = PackedHoles(request, holes)
    }
    val holes = cached ?: packed?.takeIf { it.request == request }?.holes
    val staticPath = remember(options.shape, holes) {
        if (holes == null) ShapeGeometry.bodyPath(options.shape) else ShapeGeometry.punchedPath(options.shape, holes)
    }
    val timing = remember(options.seed, options.holes, options.durationMillis) {
        HoleTiming(options.seed, options.holes, options.durationMillis)
    }
    val frameScales = remember(options.holes) { FloatArray(options.holes) }
    val framePath = remember { Path() }
    val pathBuilder = remember { ShapeGeometry.PunchedPathBuilder() }

    val interactionSource = remember { MutableInteractionSource() }
    val hovered by interactionSource.collectIsHoveredAsState()
    val holeProgress = remember { Animatable(1f) }
    val scope = rememberCoroutineScope()
    val facePaint = remember(options.faceColor) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = options.faceColor.toArgb() }
    }
    val shadowPaint = remember(options.shadowColor) {
        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = options.shadowColor.toArgb() }
    }

    suspend fun play() {
        holeProgress.snapTo(0f)
        holeProgress.animateTo(1f, tween(durationMillis = timing.windowMillis, easing = LinearEasing))
    }

    LaunchedEffect(hovered, options.animated, timing) {
        if (hovered && options.animated) play() else holeProgress.snapTo(1f)
    }

    val semanticsModifier = if (contentDescription == null) {
        Modifier
    } else {
        Modifier.semantics { this.contentDescription = contentDescription }
    }
    val touchModifier = if (options.animated) {
        Modifier.pointerInput(timing) {
            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false)
                if (down.type != PointerType.Mouse) scope.launch { play() }
            }
        }
    } else {
        Modifier
    }

    Canvas(
        modifier = modifier
            .then(semanticsModifier)
            .hoverable(interactionSource = interactionSource, enabled = options.animated)
            .then(touchModifier),
    ) {
        val scale = size.minDimension / 420f
        val left = (size.width - size.minDimension) / 2f
        val top = (size.height - size.minDimension) / 2f
        val progress = holeProgress.value
        val path = if (holes == null || progress >= 1f ||
            !timing.fillScales(progress * timing.windowMillis, frameScales)
        ) {
            staticPath
        } else {
            pathBuilder.build(framePath, options.shape, holes, frameScales)
            framePath
        }

        drawIntoCanvas { canvas ->
            val nativeCanvas = canvas.nativeCanvas
            nativeCanvas.save()
            nativeCanvas.translate(left, top)
            nativeCanvas.scale(scale, scale)
            for (step in options.shadowSteps downTo 1) {
                val ratio = step.toFloat() / options.shadowSteps
                nativeCanvas.save()
                nativeCanvas.translate(options.shadowX * ratio, options.shadowY * ratio)
                nativeCanvas.drawPath(path, shadowPaint)
                nativeCanvas.restore()
            }
            nativeCanvas.drawPath(path, facePaint)
            nativeCanvas.restore()
        }
    }
}

private val holeEasing = CubicBezierEasing(0.33f, 0f, 0.2f, 1f)

/**
 * Per-hole pulse timing matching the web package's CSS: each hole runs a 1 -> 0.06 -> 1 scale
 * keyframe animation with the cubic-bezier easing applied to each half, after its own delay.
 */
internal class HoleTiming(seed: Int, count: Int, durationMillis: Int) {
    val delays = IntArray(count) { jsRound(durationMillis * (0.04 + seededNoise(it + 1.0, 43.0, seed.toDouble()) * 0.34)) }
    val durations = IntArray(count) { jsRound(durationMillis * (0.42 + seededNoise(it + 1.0, 17.0, seed.toDouble()) * 0.16)) }
    val windowMillis: Int = (0..<count).maxOfOrNull { delays[it] + durations[it] } ?: 0

    fun scale(index: Int, elapsedMillis: Float): Float {
        val u = (elapsedMillis - delays[index]) / durations[index]
        if (u <= 0f || u >= 1f) return 1f
        return if (u < 0.5f) {
            1f - 0.94f * holeEasing.transform(2 * u)
        } else {
            0.06f + 0.94f * holeEasing.transform(2 * u - 1)
        }
    }

    /** Writes every hole's scale into [out] and reports whether any differs from 1. */
    fun fillScales(elapsedMillis: Float, out: FloatArray): Boolean {
        var changed = false
        for (index in out.indices) {
            val value = scale(index, elapsedMillis)
            out[index] = value
            if (value != 1f) changed = true
        }
        return changed
    }

    private companion object {
        fun seededNoise(x: Double, y: Double, seed: Double): Double {
            val value = sin(x * 12.9898 + y * 78.233 + seed * 41.137) * 43_758.5453
            return value - floor(value)
        }

        fun jsRound(value: Double): Int = floor(value + 0.5).toInt()
    }
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
    contentDescription: String? = "${shape.displayName} with ${holes.coerceIn(0, shape.maximumHoleCount)} holes",
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
