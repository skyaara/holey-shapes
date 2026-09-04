import com.android.build.api.dsl.LibraryExtension
import org.gradle.api.publish.maven.MavenPublication
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library") version "9.0.0"
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.10"
    id("maven-publish")
}

group = providers.gradleProperty("group").orElse("com.github.skyaara").get()
version = providers.gradleProperty("version")
    .orElse(providers.environmentVariable("VERSION"))
    .orElse("0.1.4-SNAPSHOT")
    .get()

extensions.configure<LibraryExtension> {
    namespace = "com.aakashreddy.holeyshapes"
    compileSdk = 36

    defaultConfig {
        minSdk = 26
        aarMetadata {
            minCompileSdk = 35
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
    }

    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
        warningsAsErrors = true
        disable += setOf("AndroidGradlePluginVersion", "GradleDependency", "NewerVersionAvailable")
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    api("androidx.compose.ui:ui:1.9.4")
    implementation("androidx.compose.animation:animation-core:1.9.4")
    implementation("androidx.compose.foundation:foundation:1.9.4")
}

afterEvaluate {
    publishing {
        publications {
            register<MavenPublication>("release") {
                from(components["release"])
                groupId = project.group.toString()
                artifactId = "holey-shapes"
                version = project.version.toString()

                pom {
                    name.set("Holey Shapes")
                    description.set("Perforated shape renderer for Jetpack Compose")
                    url.set("https://github.com/skyaara/holey-shapes")
                    licenses {
                        license {
                            name.set("MIT License")
                            url.set("https://opensource.org/licenses/MIT")
                        }
                    }
                    developers {
                        developer {
                            id.set("skyaara")
                            name.set("Aakash Reddy")
                            url.set("https://github.com/skyaara")
                        }
                    }
                    scm {
                        connection.set("scm:git:git://github.com/skyaara/holey-shapes.git")
                        developerConnection.set("scm:git:ssh://github.com/skyaara/holey-shapes.git")
                        url.set("https://github.com/skyaara/holey-shapes")
                    }
                }
            }
        }
    }
}
