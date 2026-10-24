package com.aakashreddy.holeyshapes

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import com.aakashreddy.holeyshapes.core.HoleyColors
import com.aakashreddy.holeyshapes.core.HoleyOrientation
import com.aakashreddy.holeyshapes.core.HoleySeeding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Every shape included in the original holey-shapes catalog. */
enum class HoleyShape(
    val key: String,
    val displayName: String,
    val color: Color,
    val backgroundColor: Color,
    val defaultHoleCount: Int,
) {
    Disc("disc", "Perforated disc", Color(0xFF6337FF), Color(0xFFD7CEFF), 5),
    RoundBlock("round-block", "Round block", Color(0xFF9BED00), Color(0xFFE7FF92), 4),
    Hex("hex", "Hex slab", Color(0xFFFF0878), Color(0xFFFFD6E4), 5),
    Capsule("capsule", "Capsule", Color(0xFF2878FF), Color(0xFFCCEDFF), 4),
    Prism("prism", "Cut prism", Color(0xFFFF6A00), Color(0xFFFFD4A3), 4),
    Cross("cross", "Cross block", Color(0xFF00DBFF), Color(0xFFD8D5CF), 5),
    Triangle("triangle", "Triangle plate", Color(0xFF00D69F), Color(0xFFB9F4DF), 4),
    Diamond("diamond", "Diamond tile", Color(0xFFFFD000), Color(0xFFFFF0A6), 5),
    Sunburst("sunburst", "Sunburst slab", Color(0xFFB94CFF), Color(0xFFE6D4FA), 5),
    Octagon("octagon", "Octagon", Color(0xFFFF3838), Color(0xFFFFD0C8), 6),
    Chevron("chevron", "Bent chevron", Color(0xFF00C9F2), Color(0xFFC9F3FF), 4),
    LongBar("long-bar", "Long bar", Color(0xFFFF4FA3), Color(0xFFFFE0EE), 5),
    FlowerStar("flower-star", "Five-point bloom", Color(0xFFFF7657), Color(0xFFFFE1D8), 5),
    Bowtie("bowtie", "Bowtie slab", Color(0xFF00D7B9), Color(0xFFD0F7F0), 6),
    ;

    val maximumHoleCount: Int get() = core.maximumHoleCount

    companion object {
        fun fromKey(key: String): HoleyShape? = entries.firstOrNull { it.key == key }
    }
}

/**
 * Rendering options for [HoleyShapeView]. The renderer clamps numeric values to supported ranges.
 * [turn] rotates the face by quarter turns and [mirror] flips it; the extrusion keeps its direction.
 */
@Immutable
data class HoleyShapeConfig(
    val shape: HoleyShape = HoleyShape.Disc,
    val faceColor: Color = shape.color,
    val shadowColor: Color = faceColor.extrusionColor(),
    val holes: Int = shape.defaultHoleCount,
    val seed: Int = 0,
    val turn: Int = 0,
    val mirror: Boolean = false,
    val animated: Boolean = true,
    val durationMillis: Int = 900,
    val shadowX: Float = 18f,
    val shadowY: Float = 21f,
    val shadowSteps: Int = 12,
) {
    internal fun normalized() = copy(
        holes = holes.coerceIn(0, shape.maximumHoleCount),
        seed = seed.coerceIn(-1_000_000, 1_000_000),
        turn = HoleyOrientation.normalize(turn),
        // Zero falls back to the default, matching the web package's `Number(duration) || 900`.
        durationMillis = if (durationMillis == 0) 900 else durationMillis.coerceIn(100, 10_000),
        shadowX = if (shadowX.isFinite()) shadowX.coerceIn(-80f, 80f) else 18f,
        shadowY = if (shadowY.isFinite()) shadowY.coerceIn(-80f, 80f) else 21f,
        shadowSteps = shadowSteps.coerceIn(1, 32),
    )

    fun shuffled(): HoleyShapeConfig = copy(
        seed = if (seed >= 1_000_000) -1_000_000 else seed + 1,
    )

    companion object {
        /**
         * FNV-1a 64 hash of the UTF-8 identity as 16 lowercase hex digits, matching
         * `identityHash` in the JavaScript package. [seeded] starts from it.
         */
        fun identityHash(identity: String): String = HoleySeeding.identityHash(identity)

        /** Creates a stable holey for an identity such as a user ID, matching the web and Swift packages. */
        fun seeded(identity: String, animated: Boolean = true): HoleyShapeConfig {
            val seeded = HoleySeeding.seeded(identity)
            return HoleyShapeConfig(
                shape = HoleyShape.valueOf(seeded.shape.name),
                faceColor = Color(0xFF000000 or seeded.faceColor.toLong()),
                shadowColor = Color(0xFF000000 or seeded.shadowColor.toLong()),
                holes = seeded.holes,
                seed = seeded.seed,
                turn = seeded.turn,
                mirror = seeded.mirror,
                animated = animated,
            )
        }
    }
}

/** Catalog metadata in the same order as the web and Swift packages. */
object HoleyShapes {
    val catalog: List<HoleyShape> = HoleyShape.entries

    /** Packs [config]'s holes off the main thread so a later [HoleyShapeView] draws them on its first frame. */
    suspend fun prewarm(config: HoleyShapeConfig) {
        val options = config.normalized()
        withContext(Dispatchers.Default) { HolePacking.layout(options.shape, options.holes, options.seed) }
    }
}

internal fun HoleyShapeConfig.defaultContentDescription(): String =
    "${shape.displayName} with ${holes.coerceIn(0, shape.maximumHoleCount)} holes"

/** The extrusion color for this face, darkened in OKLCH like the web and Swift packages. */
internal fun Color.extrusionColor(): Color {
    val argb = toArgb()
    return Color(HoleyColors.extrusion(argb and 0xFFFFFF) or (argb and 0xFF000000.toInt()))
}
