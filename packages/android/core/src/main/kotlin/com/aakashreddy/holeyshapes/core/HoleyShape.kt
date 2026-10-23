package com.aakashreddy.holeyshapes.core

enum class HoleyShape(
    val key: String,
    val displayName: String,
    val colorArgb: Long,
    val backgroundColorArgb: Long,
    val defaultHoleCount: Int,
) {
    Disc("disc", "Perforated disc", 0xFF6337FF, 0xFFD7CEFF, 5),
    RoundBlock("round-block", "Round block", 0xFF9BED00, 0xFFE7FF92, 4),
    Hex("hex", "Hex slab", 0xFFFF0878, 0xFFFFD6E4, 5),
    Capsule("capsule", "Capsule", 0xFF2878FF, 0xFFCCEDFF, 4),
    Prism("prism", "Cut prism", 0xFFFF6A00, 0xFFFFD4A3, 4),
    Cross("cross", "Cross block", 0xFF00DBFF, 0xFFD8D5CF, 5),
    Triangle("triangle", "Triangle plate", 0xFF00D69F, 0xFFB9F4DF, 4),
    Diamond("diamond", "Diamond tile", 0xFFFFD000, 0xFFFFF0A6, 5),
    Sunburst("sunburst", "Sunburst slab", 0xFFB94CFF, 0xFFE6D4FA, 5),
    Octagon("octagon", "Octagon", 0xFFFF3838, 0xFFFFD0C8, 6),
    Chevron("chevron", "Bent chevron", 0xFF00C9F2, 0xFFC9F3FF, 4),
    LongBar("long-bar", "Long bar", 0xFFFF4FA3, 0xFFFFE0EE, 5),
    FlowerStar("flower-star", "Five-point bloom", 0xFFFF7657, 0xFFFFE1D8, 5),
    Bowtie("bowtie", "Bowtie slab", 0xFF00D7B9, 0xFFD0F7F0, 6),
    ;

    val maximumHoleCount: Int get() = minOf(MAX_HOLES, templates.size)

    companion object {
        private const val MAX_HOLES = 8

        fun fromKey(key: String): HoleyShape? = entries.firstOrNull { it.key == key }
    }
}

