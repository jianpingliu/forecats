package io.forecats

import com.typesafe.config.Config
import com.maxmind.geoip2._
import java.io.File
import java.net.InetAddress
import scala.util.Try

class GeoLookup(config: Config) {

  private val dbFile = new File(config.getString("database"))
  private val reader = new DatabaseReader.Builder(dbFile).build

  def fromIP(ip: String): Option[(Double, Double)] =
    Try(InetAddress.getByName(ip))
      .flatMap(x => Try(reader.city(x))).toOption
      .map { c =>
        val l = c.getLocation
        (l.getLatitude, l.getLongitude)
      }
}
