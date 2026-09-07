plugins {
    kotlin("jvm")
    `maven-publish`
}

group = rootProject.group
version = rootProject.version

kotlin { jvmToolchain(17) }
java { withSourcesJar() }

publishing {
    publications {
        create<MavenPublication>("core") {
            from(components["java"])
            artifactId = "holey-shapes-core"
        }
    }
}

val verification by sourceSets.creating {
    compileClasspath += sourceSets.main.get().output
    runtimeClasspath += sourceSets.main.get().output
}
configurations[verification.implementationConfigurationName].extendsFrom(configurations.implementation.get())

val verifyPacking by tasks.registering(JavaExec::class) {
    dependsOn(verification.classesTaskName)
    classpath = verification.runtimeClasspath
    mainClass.set("VerifyPackingKt")
    args(layout.buildDirectory.file("packing-layouts.json").get().asFile.absolutePath)
    if (project.hasProperty("shapeCatalog") && project.hasProperty("shapeOutput")) {
        args(project.property("shapeCatalog").toString(), project.property("shapeOutput").toString())
    }
}
tasks.check { dependsOn(verifyPacking) }
