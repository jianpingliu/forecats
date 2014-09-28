import AssemblyKeys._

organization  := "io.forecats"

version       := "0.1"

scalaVersion  := "2.10.2"

scalacOptions := Seq("-unchecked", "-deprecation", "-encoding", "utf8")

libraryDependencies ++= {
  val akkaV = "2.3.5"
  val sprayV = "1.3.1"
  Seq(
    "io.spray"            %   "spray-can"     % sprayV,
    "io.spray"            %   "spray-client"  % sprayV,
    "io.spray"            %%  "spray-json"    % "1.2.6",
    "net.virtual-void"    %%  "json-lenses"   % "0.5.4",
    "io.spray"            %   "spray-routing" % sprayV,
    "io.spray"            %   "spray-testkit" % sprayV  % "test",
    "com.typesafe.akka"   %%  "akka-actor"    % akkaV,
    "net.debasishg"       %   "redisclient_2.10"  % "2.12"
  )
}

Revolver.settings

assemblySettings

jarName in assembly := "forecats.jar"

test in assembly := {}

mainClass in assembly := Some("io.forecats.Boot")
