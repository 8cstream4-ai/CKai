package app.ckai.background

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

@Suppress("DEPRECATION")
class CKaiReplyService : HeadlessJsTaskService() {
  private var jobId = ""
  private var chatId = ""
  private var isTest = false
  private var finished = false
  private val handler = Handler(Looper.getMainLooper())
  private val notifications get() = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= 26) {
      notifications.createNotificationChannel(NotificationChannel(RUNNING_CHANNEL, "Réponses en cours", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Permet à CKai de terminer la réponse lorsque tu changes d’application."
        setShowBadge(false)
      })
      notifications.createNotificationChannel(NotificationChannel(DONE_CHANNEL, "Réponses terminées", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Signale la fin d’une réponse et ouvre sa conversation."
      })
    }
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) { stopSelf(); return START_NOT_STICKY }
    if (intent.action == STOP) {
      if (intent.getStringExtra("jobId") == jobId) onStopRequest?.invoke(jobId, "user")
      return START_NOT_STICKY
    }
    if (intent.action != START) return START_NOT_STICKY
    val incoming = intent.getStringExtra("jobId").orEmpty()
    if (incoming.isBlank()) { stopSelf(); return START_NOT_STICKY }
    if (incoming == jobId && !finished) return START_NOT_STICKY
    jobId = incoming; chatId = intent.getStringExtra("chatId").orEmpty()
    isTest = intent.getBooleanExtra("test", false); finished = false; current = this
    try {
      val notification = runningNotification(if (isTest) "Test de notification en cours…" else "CKai prépare ta réponse…")
      if (Build.VERSION.SDK_INT >= 29) startForeground(RUNNING_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
      else startForeground(RUNNING_ID, notification)
      handler.removeCallbacksAndMessages(null)
      handler.postDelayed({
        if (!finished) {
          onStopRequest?.invoke(jobId, "timeout")
          complete("error", true)
          stopSelf()
        }
      }, 10 * 60 * 1000L)
      super.onStartCommand(intent, flags, startId)
    } catch (_: Exception) {
      onStopRequest?.invoke(jobId, "service")
      stopSelf()
    }
    return START_NOT_STICKY
  }
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    if (intent?.action != START) return null
    val data = Arguments.createMap().apply { putString("jobId", intent.getStringExtra("jobId")) }
    return HeadlessJsTaskConfig("CKaiReplyKeepAlive", data, 610_000, true)
  }
  override fun onTimeout(startId: Int, fgsType: Int) {
    onStopRequest?.invoke(jobId, "timeout")
    complete("error", true)
    stopSelf()
  }
  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    if (!finished && jobId.isNotEmpty()) onStopRequest?.invoke(jobId, "service")
    if (current === this) { current = null; notifications.cancel(RUNNING_ID) }
    stopForeground(Service.STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
  private fun openConversation(): PendingIntent {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
    launch.action = Intent.ACTION_VIEW
    launch.data = Uri.parse("ckai:///?conversation=" + Uri.encode(chatId))
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(this, 6101, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
  private fun builder(channel: String): Notification.Builder {
    val value = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, channel) else Notification.Builder(this)
    return value.setSmallIcon(R.drawable.ic_stat_ckai).setContentTitle("CKai").setColor(0xFFBDA0ED.toInt())
      .setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(openConversation())
  }
  private fun runningNotification(stage: String): Notification {
    val stop = PendingIntent.getService(this, 6102, Intent(this, CKaiReplyService::class.java).apply {
      action = STOP; putExtra("jobId", jobId)
      data = Uri.parse("ckai-internal://stop/" + Uri.encode(jobId))
    }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val value = builder(RUNNING_CHANNEL).setContentText(stage).setOngoing(true).setOnlyAlertOnce(true)
      .setCategory(Notification.CATEGORY_PROGRESS).setProgress(0, 0, true)
      .addAction(Notification.Action.Builder(android.R.drawable.ic_media_pause, "Arrêter", stop).build())
    if (Build.VERSION.SDK_INT >= 31) value.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    return value.build()
  }
  private fun complete(status: String, show: Boolean) {
    if (finished) return
    finished = true
    handler.removeCallbacksAndMessages(null)
    stopForeground(Service.STOP_FOREGROUND_REMOVE)
    notifications.cancel(RUNNING_ID)
    if (show && status != "stopped" && notifications.areNotificationsEnabled()) {
      val content = if (isTest) "Notification de test CKai" else if (status == "complete") "Ta réponse est prête" else "La réponse a été interrompue"
      notifications.notify(DONE_ID, builder(DONE_CHANNEL).setContentText(content)
        .setCategory(Notification.CATEGORY_MESSAGE).setAutoCancel(true).build())
    }
    // Resolving the JS job ends the headless task; the superclass then stops this service.
  }
  companion object {
    const val START = "app.ckai.background.START"
    const val STOP = "app.ckai.background.STOP"
    private const val RUNNING_CHANNEL = "ckai-reply-running"
    private const val DONE_CHANNEL = "ckai-reply-done"
    private const val RUNNING_ID = 6101
    private const val DONE_ID = 6102
    @Volatile private var current: CKaiReplyService? = null
    @Volatile var onStopRequest: ((String, String) -> Unit)? = null
    fun update(id: String, stage: String) {
      current?.takeIf { it.jobId == id && !it.finished }?.let { service ->
        if (service.notifications.areNotificationsEnabled()) service.notifications.notify(RUNNING_ID, service.runningNotification(stage))
      }
    }
    fun finish(id: String, status: String, show: Boolean) {
      current?.takeIf { it.jobId == id }?.complete(status, show)
    }
  }
}
