import com.aakashreddy.holeyshapes.core.HoleyColors
import com.aakashreddy.holeyshapes.core.HoleyOrientation
import com.aakashreddy.holeyshapes.core.HoleyPacking
import com.aakashreddy.holeyshapes.core.HoleySeeding
import com.aakashreddy.holeyshapes.core.HoleyShape
import java.io.File

fun main(args: Array<String>) {
    val layouts = mutableListOf<String>()
    val started = System.nanoTime()
    for (shape in HoleyShape.entries) for (count in 0..8) for (seed in listOf(0, 1, 7, 42, -19)) {
        val holes = HoleyPacking.layout(shape, count, seed)
        check(holes.size == count)
        check(holes == HoleyPacking.uncachedLayout(shape, count, seed))
        val areas = holes.map { it.rx * it.ry }
        if (areas.isNotEmpty()) {
            check(areas.all { it.isFinite() && it > 0 })
            // Radii are rounded to 3 decimals like the JavaScript SDK, so areas match to that precision.
            check(areas.max() / areas.min() < 1.001)
            if (shape == HoleyShape.Disc && count == 1) check(areas.min() > 10000)
        }
        val json = holes.joinToString(",") {
            """{"cx":${it.cx},"cy":${it.cy},"rx":${it.rx},"ry":${it.ry},"rotation":${it.rotation}}"""
        }
        layouts.add("""{"shape":"${shape.key}","count":$count,"seed":$seed,"holes":[$json]}""")
    }
    check(HoleyPacking.layout(count = Int.MIN_VALUE, seed = Int.MIN_VALUE).isEmpty())
    check(HoleyPacking.layout(count = Int.MAX_VALUE, seed = Int.MAX_VALUE).size == 8)
    File(args[0]).writeText(layouts.joinToString(",", "[", "]"))
    verifySeeding(File(System.getProperty("seedingVectors")))
    if (args.size == 3) writeSamples(args[1], args[2])
    val elapsedMillis = (System.nanoTime() - started) / 1_000_000
    println("Kotlin JVM process passed: ${layouts.size} layouts, each packed twice, in $elapsedMillis ms")
}

// TSV contains only catalog outlines/colors. Hole geometry always comes from the JVM SDK.
private fun writeSamples(catalogFile: String, outputDirectory: String) {
    val catalog = File(catalogFile).readLines().associate { line ->
        val parts = line.split('\t')
        parts[0] to parts
    }
    val output = File(outputDirectory).apply { mkdirs() }
    for (shape in HoleyShape.entries) {
        val entry = catalog.getValue(shape.key)
        val holes = HoleyPacking.layout(shape, shape.defaultHoleCount, 7)
        val ellipses = holes.joinToString("") {
            """<ellipse cx="${it.cx}" cy="${it.cy}" rx="${it.rx}" ry="${it.ry}" transform="rotate(${it.rotation} ${it.cx} ${it.cy})"/>"""
        }
        val body = """<path d="${entry[1]}" mask="url(#holes)"/>"""
        val depth = (12 downTo 1).joinToString("") { step ->
            """<g fill="#252038" transform="translate(${step * 1.5} ${step * 1.75})">$body</g>"""
        }
        val svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420"><title>Kotlin: ${shape.displayName}</title><defs><mask id="holes"><rect width="420" height="420" fill="white"/><g fill="black">$ellipses</g></mask></defs>$depth<g fill="${entry[2]}">$body</g></svg>"""
        File(output, "${shape.key}.svg").writeText(svg)
    }
    println("Kotlin wrote 14 SVG samples to ${output.absolutePath}")
}

// Seeded identities, every hue step and extrusion colors must match the vectors written by the
// JavaScript package (scripts/seeding-vectors.mjs).
private fun verifySeeding(vectors: File) {
    check(HoleySeeding.identityHash("relay-agent") == "0cc0c8aa3dbd893e")
    check(HoleyOrientation.normalize(450) == 90 && HoleyOrientation.normalize(-90) == 270)
    check(HoleyOrientation.normalize(-45) == 0 && HoleyOrientation.normalize(45) == 90)
    var checked = 0
    vectors.readLines().drop(1).filter { it.isNotEmpty() }.forEach { line ->
        val fields = line.split('\t')
        val expected = fields.drop(2)
        val actual = when (fields[0]) {
            "seed" -> HoleySeeding.seeded(fields[1]).let {
                listOf(it.shape.key, "${it.holes}", "${it.seed}", "${it.turn}", if (it.mirror) "1" else "0",
                    HoleyColors.hex(it.faceColor), HoleyColors.hex(it.shadowColor))
            }
            "hue" -> listOf(HoleyColors.hex(HoleyColors.hue(fields[1].toInt() / 10.0)))
            else -> listOf(HoleyColors.hex(HoleyColors.extrusion(fields[1].drop(1).toInt(16))))
        }
        check(actual == expected) { "${fields[0]} ${fields[1]}: $actual != $expected" }
        checked++
    }
    println("Kotlin seeding matched JavaScript: $checked vectors")
}
