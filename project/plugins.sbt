resolvers += Resolver.url("untyped", url("http://ivy.untyped.com"))(Resolver.ivyStylePatterns)

addSbtPlugin("io.spray" % "sbt-revolver" % "0.7.2")

addSbtPlugin("com.eed3si9n" % "sbt-assembly" % "0.11.2")

addSbtPlugin("com.untyped" % "sbt-js" % "0.7")
