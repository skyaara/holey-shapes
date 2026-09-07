package com.aakashreddy.holeyshapes

internal typealias Hole = com.aakashreddy.holeyshapes.core.Hole

internal object HolePacking {
    fun layout(shape: HoleyShape, count: Int, seed: Int): List<Hole> =
        com.aakashreddy.holeyshapes.core.HoleyPacking.layout(
            com.aakashreddy.holeyshapes.core.HoleyShape.valueOf(shape.name), count, seed)
}
