package com.aakashreddy.holeyshapes.core

/** A stable holey for an identity. Colors are 0xRRGGBB. */
data class SeededHoley(
    val shape: HoleyShape,
    val holes: Int,
    val seed: Int,
    val turn: Int,
    val mirror: Boolean,
    val faceColor: Int,
    val shadowColor: Int,
)

/**
 * Identity seeding shared with the JavaScript and Swift packages. The identity hash is mixed
 * once, with a bijection so no bits are lost, then read as mixed-radix digits so every field
 * gets its own bits.
 */
object HoleySeeding {
    /** FNV-1a 64 hash of the UTF-8 identity as 16 lowercase hex digits. */
    fun identityHash(identity: String): String = fnv1a64(identity).toString(16).padStart(16, '0')

    fun seeded(identity: String): SeededHoley {
        var rest = mix(fnv1a64(identity))
        fun take(count: Int): Int {
            val digit = (rest % count.toULong()).toInt()
            rest /= count.toULong()
            return digit
        }
        val shape = HoleyShape.entries[take(HoleyShape.entries.size)]
        val fewest = maxOf(2, shape.defaultHoleCount - 1)
        val most = minOf(shape.maximumHoleCount, shape.defaultHoleCount + 1)
        val holes = fewest + take(most - fewest + 1)
        val turn = take(4) * 90
        val mirror = take(2) == 1
        val face = HoleyColors.hue(take(3600) / 10.0)
        val seed = take(1_000_001)
        return SeededHoley(shape, holes, seed, turn, mirror, face, HoleyColors.extrusion(face))
    }

    private fun fnv1a64(identity: String): ULong {
        var hash = 14_695_981_039_346_656_037uL
        identity.encodeToByteArray().forEach { byte ->
            hash = hash xor (byte.toULong() and 0xFFuL)
            hash *= 1_099_511_628_211uL
        }
        return hash
    }

    /** The SplitMix64 finalizer: a bijection on 64-bit values. */
    private fun mix(input: ULong): ULong {
        var value = input
        value = (value xor (value shr 30)) * 0xBF58476D1CE4E5B9uL
        value = (value xor (value shr 27)) * 0x94D049BB133111EBuL
        return value xor (value shr 31)
    }
}

/**
 * OKLCH colors shared with the JavaScript and Swift packages. The steps mirror `color.js`, and
 * [StrictMath] gives the same results on every JVM and Android device, so all platforms round
 * to the same hex values.
 */
object HoleyColors {
    /** The face color for a hue in degrees. Yellows only look clean when lighter. */
    fun hue(hue: Double): Int {
        val distance = StrictMath.abs(((hue - 100) % 360 + 540) % 360 - 180)
        val lift = if (distance < 60) StrictMath.pow(StrictMath.cos(distance / 60 * (StrictMath.PI / 2)), 2.0) else 0.0
        val angle = hue * StrictMath.PI / 180
        return oklab(0.74 + 0.12 * lift, 0.19 * StrictMath.cos(angle), 0.19 * StrictMath.sin(angle))
    }

    /** The extrusion color for a face: the same hue at 56% of its lightness and 70% of its chroma. */
    fun extrusion(face: Int): Int {
        val r = toLinear((face shr 16) and 0xFF)
        val g = toLinear((face shr 8) and 0xFF)
        val b = toLinear(face and 0xFF)
        val l = StrictMath.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
        val m = StrictMath.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
        val s = StrictMath.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
        val lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
        val a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
        val bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
        return oklab(lightness * 0.56, a * 0.7, bb * 0.7)
    }

    /** 0xRRGGBB as #RRGGBB. */
    fun hex(rgb: Int): String = "#" + (rgb and 0xFFFFFF).toString(16).padStart(6, '0').uppercase()

    private fun toLinear(channel: Int): Double {
        val c = channel / 255.0
        return if (c <= 0.04045) c / 12.92 else StrictMath.pow((c + 0.055) / 1.055, 2.4)
    }

    private fun toGamma(c: Double): Double =
        if (c <= 0.0031308) 12.92 * c else 1.055 * StrictMath.pow(c, 1 / 2.4) - 0.055

    private fun linearRgb(lightness: Double, a: Double, b: Double): DoubleArray {
        val l = lightness + 0.3963377774 * a + 0.2158037573 * b
        val m = lightness - 0.1055613458 * a - 0.0638541728 * b
        val s = lightness - 0.0894841775 * a - 1.291485548 * b
        val l3 = l * l * l
        val m3 = m * m * m
        val s3 = s * s * s
        return doubleArrayOf(
            4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
            -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
            -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
        )
    }

    private fun inGamut(rgb: DoubleArray) = rgb.all { it >= -0.0001 && it <= 1.0001 }

    private fun pack(rgb: DoubleArray): Int = rgb.fold(0) { packed, value ->
        val channel = StrictMath.floor(toGamma(value.coerceIn(0.0, 1.0)) * 255 + 0.5).toInt()
        (packed shl 8) or channel
    }

    /** Keeps lightness and hue, and reduces chroma until the color fits in sRGB. */
    private fun oklab(lightness: Double, a: Double, b: Double): Int {
        val full = linearRgb(lightness, a, b)
        if (inGamut(full)) return pack(full)
        var low = 0.0
        var high = 1.0
        repeat(24) {
            val mid = (low + high) / 2
            if (inGamut(linearRgb(lightness, a * mid, b * mid))) low = mid else high = mid
        }
        return pack(linearRgb(lightness, a * low, b * low))
    }
}

/**
 * Quarter turns about the 420-unit center after an optional left-right mirror, as the affine
 * values (a, b, c, d, tx, ty). Matches the web package's
 * `rotate(turn 210 210) translate(420 0) scale(-1 1)`.
 */
object HoleyOrientation {
    fun matrix(turn: Int, mirror: Boolean): DoubleArray {
        val m = if (mirror) doubleArrayOf(-1.0, 0.0, 0.0, 1.0, 420.0, 0.0) else doubleArrayOf(1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
        val r = when (turn) {
            90 -> doubleArrayOf(0.0, 1.0, -1.0, 0.0, 420.0, 0.0)
            180 -> doubleArrayOf(-1.0, 0.0, 0.0, -1.0, 420.0, 420.0)
            270 -> doubleArrayOf(0.0, -1.0, 1.0, 0.0, 0.0, 420.0)
            else -> doubleArrayOf(1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
        }
        // r after m: x' = r(m(x)).
        return doubleArrayOf(
            r[0] * m[0] + r[2] * m[1],
            r[1] * m[0] + r[3] * m[1],
            r[0] * m[2] + r[2] * m[3],
            r[1] * m[2] + r[3] * m[3],
            r[0] * m[4] + r[2] * m[5] + r[4],
            r[1] * m[4] + r[3] * m[5] + r[5],
        )
    }

    /** Nearest quarter turn in 0, 90, 180 or 270, rounding halves up as JavaScript does. */
    fun normalize(turn: Int): Int {
        val quarters = StrictMath.floor(turn.coerceIn(-36_000, 36_000) / 90.0 + 0.5).toInt()
        return (quarters % 4 + 4) % 4 * 90
    }
}
