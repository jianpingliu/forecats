package io.forecats

import akka.actor.{ActorSystem, Props}
import akka.io.IO
import com.typesafe.config.{Config, ConfigFactory}
import spray.can.Http

object Boot extends App {

  implicit val system = ActorSystem("on-spray-can")

  val config = ConfigFactory.load.getConfig("forecats")

  IO(Http) ! Http.Bind(
    system.actorOf(Props(new ForecatsActor(config)), "forecats-service"),
    interface = config.getString("interface"),
    port = config.getInt("port")
  )

  // TODO: attach an actor to EventStream to better debug
  // dead letters. <http://stackoverflow.com/questions/23902900/how-to-view-akka-dead-letters>
}
