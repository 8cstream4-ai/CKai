package app.ckai.background

import android.content.Context
import android.content.Intent
import android.app.NotificationManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CKaiBackgroundModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CKaiBackground")
    Events("onStop")
    OnCreate {
      CKaiReplyService.onStopRequest = { jobId, reason ->
        sendEvent("onStop", mapOf("jobId" to jobId, "reason" to reason))
      }
    }
    OnDestroy { CKaiReplyService.onStopRequest = null }
    Function("canNotify") {
      val context = appContext.reactContext ?: return@Function false
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).areNotificationsEnabled()
    }
    AsyncFunction("start") { jobId: String, chatId: String, isTest: Boolean ->
      require(jobId.isNotBlank() && jobId.length <= 128 && chatId.length <= 128)
      val context = appContext.reactContext ?: throw IllegalStateException("Contexte Android indisponible.")
      val intent = Intent(context, CKaiReplyService::class.java).apply {
        action = CKaiReplyService.START
        putExtra("jobId", jobId); putExtra("chatId", chatId); putExtra("test", isTest)
      }
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
    }
    Function("update") { jobId: String, stage: String -> CKaiReplyService.update(jobId, stage.take(70)) }
    AsyncFunction("finish") { jobId: String, status: String, showNotification: Boolean ->
      CKaiReplyService.finish(jobId, status, showNotification)
    }
  }
}
