package com.aakashreddy.holeyshapes

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class HoleyShapeConfigTest {
    @Test fun nonFiniteOffsetsUseDefaults() {
        for (value in listOf(Float.NaN, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY)) {
            val config = HoleyShapeConfig(shadowX = value, shadowY = value).normalized()
            assertEquals(18f, config.shadowX, 0f)
            assertEquals(21f, config.shadowY, 0f)
        }
    }

    @Test fun finiteOffsetsAreClamped() {
        val config = HoleyShapeConfig(shadowX = 500f, shadowY = -500f).normalized()
        assertEquals(80f, config.shadowX, 0f)
        assertEquals(-80f, config.shadowY, 0f)
    }

    @Test fun holesAreClampedToShapeMaximum() {
        for (shape in HoleyShape.entries) {
            assertEquals(shape.core.maximumHoleCount, shape.maximumHoleCount)
            assertEquals(0, HoleyShapeConfig(shape = shape, holes = -3).normalized().holes)
            assertEquals(shape.maximumHoleCount, HoleyShapeConfig(shape = shape, holes = Int.MAX_VALUE).normalized().holes)
            assertEquals(3, HoleyShapeConfig(shape = shape, holes = 3).normalized().holes)
        }
    }

    @Test fun identityHashAndSeedMatchWebPackage() {
        assertEquals("cbf29ce484222325", HoleyShapeConfig.identityHash(""))
        assertEquals("0cc0c8aa3dbd893e", HoleyShapeConfig.identityHash("relay-agent"))
        assertEquals("7f88f6cbd1e4ef7d", HoleyShapeConfig.identityHash("héllo 👋"))
        val seeded = HoleyShapeConfig.seeded("relay-agent")
        assertEquals(HoleyShape.Prism, seeded.shape)
        assertEquals(3, seeded.holes)
        assertEquals(922_032, seeded.seed)
        assertEquals(90, seeded.turn)
        assertEquals(true, seeded.mirror)
        assertEquals(Color(0xFFEDD200).toArgb(), seeded.faceColor.toArgb())
        assertEquals(Color(0xFF6C5E00).toArgb(), seeded.shadowColor.toArgb())
    }

    @Test fun turnsNormalizeToQuarterTurns() {
        assertEquals(90, HoleyShapeConfig(turn = 450).normalized().turn)
        assertEquals(270, HoleyShapeConfig(turn = -90).normalized().turn)
        assertEquals(0, HoleyShapeConfig(turn = -45).normalized().turn)
        assertEquals(90, HoleyShapeConfig(turn = 45).normalized().turn)
        assertEquals(false, HoleyShapeConfig().mirror)
    }

    @Test fun seedIsClamped() {
        assertEquals(1_000_000, HoleyShapeConfig(seed = Int.MAX_VALUE).normalized().seed)
        assertEquals(-1_000_000, HoleyShapeConfig(seed = Int.MIN_VALUE).normalized().seed)
        assertEquals(42, HoleyShapeConfig(seed = 42).normalized().seed)
    }

    @Test fun durationMatchesWebDefaultsAndRange() {
        assertEquals(900, HoleyShapeConfig(durationMillis = 0).normalized().durationMillis)
        assertEquals(100, HoleyShapeConfig(durationMillis = 50).normalized().durationMillis)
        assertEquals(100, HoleyShapeConfig(durationMillis = -5).normalized().durationMillis)
        assertEquals(10_000, HoleyShapeConfig(durationMillis = 20_000).normalized().durationMillis)
        assertEquals(1_500, HoleyShapeConfig(durationMillis = 1_500).normalized().durationMillis)
    }

    @Test fun contentDescriptionUsesClampedHoleCount() {
        assertEquals("Perforated disc with 8 holes", HoleyShapeConfig(holes = 99).defaultContentDescription())
        assertEquals("Perforated disc with 0 holes", HoleyShapeConfig(holes = -1).defaultContentDescription())
    }

    @Test fun extrusionColorMatchesWebPackage() {
        assertEquals(Color(0xFF2A0081).toArgb(), Color(0xFF6337FF).extrusionColor().toArgb())
        assertEquals(Color(0xFF745E00).toArgb(), Color(0xFFFFD000).extrusionColor().toArgb())
        assertEquals(Color(0xFF006152).toArgb(), Color(0xFF00D7B9).extrusionColor().toArgb())
        assertEquals(Color(0xFF2A0081).toArgb(), HoleyShapeConfig().shadowColor.toArgb())
        assertEquals(0x80, (Color(0x80FFFFFF).extrusionColor().toArgb() ushr 24))
    }

    @Test fun holeTimingMatchesWebPackage() {
        val zero = HoleTiming(seed = 0, count = 8, durationMillis = 900)
        assertArrayEquals(intArrayOf(57, 90, 325, 185, 264, 66, 86, 317), zero.delays)
        assertArrayEquals(intArrayOf(467, 499, 513, 522, 521, 495, 498, 404), zero.durations)
        val seeded = HoleTiming(seed = -19, count = 8, durationMillis = 2500)
        assertArrayEquals(intArrayOf(120, 121, 185, 740, 834, 279, 581, 260), seeded.delays)
        assertArrayEquals(intArrayOf(1138, 1202, 1304, 1298, 1269, 1269, 1052, 1288), seeded.durations)
        assertEquals((0..7).maxOf { seeded.delays[it] + seeded.durations[it] }, seeded.windowMillis)
    }

    @Test fun holeScalePulsesOncePerHole() {
        val timing = HoleTiming(seed = 7, count = 1, durationMillis = 900)
        val delay = timing.delays[0].toFloat()
        val duration = timing.durations[0].toFloat()
        assertEquals(1f, timing.scale(0, 0f), 0f)
        assertEquals(1f, timing.scale(0, delay), 0f)
        assertEquals(0.06f, timing.scale(0, delay + duration / 2), 1e-4f)
        assertEquals(1f, timing.scale(0, delay + duration), 0f)
        val quarter = timing.scale(0, delay + duration / 4)
        val threeQuarters = timing.scale(0, delay + duration * 3 / 4)
        assert(quarter in 0.06f..1f && threeQuarters in 0.06f..1f)
        val scales = FloatArray(1)
        assertEquals(false, timing.fillScales(0f, scales))
        assertEquals(true, timing.fillScales(delay + duration / 2, scales))
    }
}
