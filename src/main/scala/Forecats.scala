package io.forecats

import akka.actor.{Actor, ActorSystem}
import com.typesafe.config.Config
import spray.routing._
import spray.httpx.encoding._
import spray.http.MediaTypes.{
  `application/json` => JSON,
  `text/html` => HTML
}

class ForecatsActor(config: Config)(implicit system: ActorSystem) 
  extends Actor 
  with ForecatsService {

  def actorRefFactory = context
  implicit def executionContext = actorRefFactory.dispatcher

  val weatherUtil = new WeatherLookup(config.getString("forecast.apiKey"))
  val catUtil = new CatLookup(config.getConfig("redis"))

  def receive = runRoute {
    //weatherRequest ~ 
    catRequest ~
    frontEndRoutes
  }
}

trait ForecatsService extends HttpService {

  import scala.concurrent.ExecutionContext.Implicits.global

  val weatherUtil: WeatherLookup
  val catUtil: CatLookup

  lazy val frontend = scala.io.Source.fromURL(
    getClass.getResource("/www/index.html")
  ).mkString

  def frontEndWithCat(cat: String) = frontend.replace("CAT_ID", cat)
  
  val frontEndRoutes =
    compressResponseIfRequested() {
      path("") { 
        onSuccess(catUtil.getRandom) { cat =>
          respondWithMediaType(HTML) {
            complete(frontEndWithCat(cat))
          }
        }
      } ~
      getFromResourceDirectory("www")
    }

  def weatherRequest =
    path("weather" / DoubleNumber ~ "," ~ DoubleNumber) { (lat, lon) =>
      onSuccess(fromCoordinatesLookup(lat, lon)) { response =>
        respondWithMediaType(JSON) {
          complete(response.toJson.toString)
        }
      }
    }

  def fromCoordinatesLookup(lat: Double, lon: Double) = 
    weatherUtil.getWeather(lat, lon) 

  def catRequest = 
    path("cats" / "random") {
      onSuccess(catUtil.getRandom) { cat =>
        complete(cat)
      }
    }
}
