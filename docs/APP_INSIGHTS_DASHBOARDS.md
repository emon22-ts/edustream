## App Insights Dashboard

Once App Insights is collecting data, build these views to demonstrate "expert-level" observability in your video.

### Dashboard 1: Live operations (Portal → App Insights → Dashboards)

**Tile 1: Live Metrics Stream**
- App Insights → Live Metrics
- Pin to dashboard
- Shows real-time request rate, response time, failure rate

**Tile 2: Failed Requests (last hour)**
- App Insights → Failures
- Pin

**Tile 3: Custom event funnel — Course creation**
- App Insights → Logs (KQL)
- Run this query and pin the chart:

```kusto
customEvents
| where timestamp > ago(24h)
| where name in ("CourseCreated", "ContentModerationBlocked", "ApiError")
| summarize count() by name, bin(timestamp, 1h)
| render timechart
```

**Tile 4: Top API endpoints by request count**
```kusto
requests
| where timestamp > ago(24h)
| summarize count(), avg(duration), percentile(duration, 95) by name
| order by count_ desc
| take 10
```

**Tile 5: Dependency calls — Cosmos DB performance**
```kusto
dependencies
| where timestamp > ago(24h)
| where target contains "documents.azure.com"
| summarize avg(duration), percentile(duration, 95), count() by name, bin(timestamp, 5m)
| render timechart
```

**Tile 6: Custom metric — Video upload duration**
```kusto
customMetrics
| where name == "VideoUploadDuration"
| extend sizeMB = todouble(customDimensions.size) / 1024 / 1024
| project timestamp, durationMs = value, sizeMB
| render scatterchart
```

### Dashboard 2: Failures and errors

**Tile 1: Exception trend**
```kusto
exceptions
| where timestamp > ago(7d)
| summarize count() by type, bin(timestamp, 1h)
| render timechart
```

**Tile 2: Top failing operations**
```kusto
requests
| where success == false
| where timestamp > ago(24h)
| summarize count(), avg(duration) by name, resultCode
| order by count_ desc
```

**Tile 3: Content moderation activity**
```kusto
customEvents
| where name == "ContentModerationBlocked"
| extend categories = tostring(customDimensions.categories)
| summarize count() by categories, bin(timestamp, 1d)
| render barchart
```

### Setting up the dashboards (steps)

1. Portal → Application Insights → `edustream-insights`
2. Top right → "+ New dashboard" → blank dashboard
3. Name it "EduStream+ Operations"
4. From the left, drag a "Markdown" tile and add a header: "EduStream+ — Live Operations"
5. Run each KQL query above in the **Logs** blade
6. After running each query, click "Pin to" → select your dashboard
7. Resize tiles to fit nicely
8. Save the dashboard
9. Set as default (optional)

Take a screenshot for your video — this is what "expert-level monitoring" looks like.

### Configuring alerts (one-line bonus)

Application Insights → Alerts → + Create → Alert rule
- Signal: "Failed requests"
- Operator: Greater than 5 in 5 minutes
- Action: Email yourself
- Save

Mention this in your video — "alerts are configured to email me if failure rate spikes."
