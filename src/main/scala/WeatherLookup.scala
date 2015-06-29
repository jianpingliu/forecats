package io.forecats

import akka.actor.ActorSystem
import com.typesafe.config.Config
import scala.concurrent.Future
import spray.caching.{LruCache, Cache}
import spray.client.pipelining._
import spray.util._

class WeatherLookup(config: Config, cacheConfig: Config)(implicit system: ActorSystem) {

  import system.dispatcher
  import DataTypes.Forecast

  private val apiKey = config.getString("apiKey")
  
  val baseUrl = s"https://api.forecast.io/forecast/${apiKey}"
  val options = "exclude=minutely,alerts,flags"
  val pipeline = sendReceive ~> unmarshal[Forecast]

  val weatherCache: Cache[Forecast] = LruCache(
    maxCapacity = cacheConfig.getInt("capacity.max"),
    initialCapacity = cacheConfig.getInt("capacity.initial"),
    timeToLive = cacheConfig.getDuration("ttl")
  )

  def getWeather(lat: Double, lng: Double): Future[Forecast] =
    weatherCache(s"$lat,$lng") {
      pipeline {
        Get(s"${baseUrl}/${lat},${lng}?${options}")
      }
    }
}
