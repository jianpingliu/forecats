import AssemblyKeys._

organization  := "io.forecats"

version       := "0.1"

scalaVersion  := "2.11.2"

scalacOptions := Seq("-unchecked", "-deprecation", "-encoding", "utf8")

libraryDependencies ++= {
  val sprayV = "1.3.2"
  Seq(
    "com.typesafe.akka"   %%  "akka-actor"    % "2.3.6",
    "io.spray"            %%  "spray-can"     % sprayV,
    "io.spray"            %%  "spray-client"  % sprayV,
    "io.spray"            %%  "spray-routing" % sprayV,
    "io.argonaut"         %%  "argonaut"      % "6.0.4",
    "net.debasishg"       %%  "redisclient"   % "2.13"
  )
}

Revolver.settings

assemblySettings

jarName in assembly := "forecats.jar"

mergeStrategy in assembly <<= (mergeStrategy in assembly) { old => {
  case PathList("www", xs @ _*) => MergeStrategy.discard
  case x => old(x)
}}

test in assembly := {}

mainClass in assembly := Some("io.forecats.Boot")
