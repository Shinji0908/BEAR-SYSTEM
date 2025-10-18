package com.example.bearapp.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.bearapp.IncidentInboxActivity
import com.example.bearapp.ResidentDashboardActivity
import com.example.bearapp.R
import com.example.bearapp.models.IncidentG
import com.example.bearapp.util.SessionManager

class NotificationManagerAppGuide(private val context: Context, private val sessionManager: SessionManager) {
    private val urgentChannelId = "bear_urgent_alerts_channel"
    private val resolvedChannelId = "bear_resolved_alerts_channel"
    private val silentChannelId = "bear_silent_alerts_channel"
    private val TAG = "NotificationManagerAG"
    private val baseNotificationId = 2001

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val urgentSoundUri = Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${context.packageName}/${R.raw.bear_alert}")
            val urgentChannel = NotificationChannel(
                urgentChannelId,
                "B.E.A.R. Urgent Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Plays a loud alert for new nearby incidents."
                setSound(urgentSoundUri, audioAttributes)
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(urgentChannel)

            val resolvedSoundUri = Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${context.packageName}/${R.raw.resolved_chime}")
            val resolvedChannel = NotificationChannel(
                resolvedChannelId,
                "B.E.A.R. Resolved Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Plays a gentle chime when an incident is resolved."
                setSound(resolvedSoundUri, audioAttributes)
                enableVibration(false)
            }
            notificationManager.createNotificationChannel(resolvedChannel)

            val silentChannel = NotificationChannel(
                silentChannelId,
                "B.E.A.R. Silent Pop-ups",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Silent notifications that pop up without sound (e.g., In Progress updates)."
                setSound(null, null)
                enableVibration(false)
            }
            notificationManager.createNotificationChannel(silentChannel)

            Log.d(TAG, "Urgent, Resolved, and Silent notification channels created/updated.")
        }
    }

    fun showIncidentNotification(incident: IncidentG, isStatusUpdate: Boolean) {
        val userRole = sessionManager.userRole
        // --- UPDATED: Navigate responders to the new Incident Inbox ---
        val targetActivity = when (userRole?.lowercase()) {
            "responder" -> IncidentInboxActivity::class.java
            "resident" -> ResidentDashboardActivity::class.java
            else -> {
                Log.w(TAG, "Unknown user role: '$userRole'. Defaulting to ResidentDashboard.")
                ResidentDashboardActivity::class.java
            }
        }

        val intent = Intent(context, targetActivity).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("incident_id", incident._id)
        }

        val pendingIntent = PendingIntent.getActivity(
            context, incident._id.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId: String
        val priority: Int

        if (isStatusUpdate) {
            when (incident.status.lowercase()) {
                "resolved" -> {
                    channelId = resolvedChannelId
                    priority = NotificationCompat.PRIORITY_DEFAULT
                }
                "in progress" -> {
                    channelId = silentChannelId
                    priority = NotificationCompat.PRIORITY_DEFAULT
                }
                else -> {
                    channelId = silentChannelId
                    priority = NotificationCompat.PRIORITY_DEFAULT
                }
            }
        } else {
            channelId = urgentChannelId
            priority = NotificationCompat.PRIORITY_HIGH
        }

        Log.d(TAG, "Using channel '$channelId' for notification for role '$userRole'")

        val typeIcon = getTypeIcon(incident.type)
        val typeColor = getTypeColor(incident.type)
        val title = if (isStatusUpdate) "Status Update: ${incident.name}" else "New Incident: ${incident.name}"

        val bigTextStyle = NotificationCompat.BigTextStyle()
            .setBigContentTitle(title)
            .bigText("Description: ${incident.description ?: "N/A"}\n" +
                "Type: ${incident.type.replaceFirstChar { it.titlecase() }}\n" +
                "Status: ${incident.status}")

        val notificationBuilder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(typeIcon)
            .setContentTitle(title)
            .setContentText("Status: ${incident.status} - Tap for details")
            .setStyle(bigTextStyle)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(typeColor)
            .setPriority(priority)
            .setCategory(NotificationCompat.CATEGORY_ALARM)

        val notification = notificationBuilder.build()

        with(NotificationManagerCompat.from(context)) {
            notify(baseNotificationId + incident._id.hashCode(), notification)
        }
    }

    private fun getTypeIcon(type: String): Int {
        return when (type.lowercase()) {
            "fire" -> R.drawable.fire
            "hospital" -> R.drawable.hospital
            "police" -> R.drawable.police
            "barangay" -> R.drawable.barangay
            else -> R.mipmap.ic_launcher
        }
    }

    private fun getTypeColor(type: String): Int {
        return when (type.lowercase()) {
            "fire" -> android.graphics.Color.RED
            "hospital" -> android.graphics.Color.GREEN
            "police" -> android.graphics.Color.BLUE
            "barangay" -> android.graphics.Color.parseColor("#FFA500")
            else -> android.graphics.Color.DKGRAY
        }
    }
}
