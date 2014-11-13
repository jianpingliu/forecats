package io.forecats

import akka.actor.ActorSystem
import scala.concurrent.Future
import spray.http._
import spray.client.pipelining._

class WeatherLookup(apiKey: String)(implicit system: ActorSystem) {

  import system.dispatcher
  import DataTypes.Forecast
  
  val baseUrl = s"https://api.forecast.io/forecast/${apiKey}"
  val options = "exclude=hourly,minutely,alerts,flags"
  val pipeline = sendReceive ~> unmarshal[Forecast]

  def getWeather(lat: Double, lon: Double) =
    pipeline {
      Get(s"${baseUrl}/${lat},${lon}?${options}")
    }
}
