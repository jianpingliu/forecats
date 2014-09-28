package io.forecats

import akka.actor.ActorSystem
import com.typesafe.config.Config
import scala.concurrent.{Future, Promise}
import com.redis._

class CatLookup(val config: Config)(implicit system: ActorSystem) {

  import system.dispatcher

  private val r = new RedisClient(
    config.getString("host"),
    config.getInt("port")
  )

  def getRandom = getRandomByTag("cats") 

  def getRandomByTag(tag: String) = {
    val p = Promise[String]()
    Future {
      r.srandmember(tag) match {
        case Some(id) => p.success(id)
        case None => p.failure(new Exception)
      }
    }

    p.future
  }
}
