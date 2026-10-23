package com.aakashreddy.holeyshapes

import com.aakashreddy.holeyshapes.core.HoleyPacking

internal typealias Hole = com.aakashreddy.holeyshapes.core.Hole

internal val HoleyShape.core: com.aakashreddy.holeyshapes.core.HoleyShape
    get() = com.aakashreddy.holeyshapes.core.HoleyShape.valueOf(name)

internal object HolePacking {
    fun layout(shape: HoleyShape, count: Int, seed: Int): List<Hole> = HoleyPacking.layout(shape.core, count, seed)

    fun cachedLayout(shape: HoleyShape, count: Int, seed: Int): List<Hole>? =
        HoleyPacking.cachedLayout(shape.core, count, seed)
}
