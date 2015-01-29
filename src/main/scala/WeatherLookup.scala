package io.forecats

import akka.actor.ActorSystem
import com.typesafe.config.Config
import spray.client.pipelining._

class WeatherLookup(config: Config)(implicit system: ActorSystem) {

  import system.dispatcher
  import DataTypes.Forecast

  private val apiKey = config.getString("apiKey")
  
  val baseUrl = s"https://api.forecast.io/forecast/${apiKey}"
  val options = "exclude=minutely,alerts,flags"
  val pipeline = sendReceive ~> unmarshal[Forecast]

  def getWeather(lat: Double, lon: Double) =
    pipeline {
      Get(s"${baseUrl}/${lat},${lon}?${options}")
    }
}
