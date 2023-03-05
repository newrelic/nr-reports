# {{title}}

This is a sample New Relic Monitoring Report for **{{accountName}}**, account
id **{{accountId}}**.

## 4 Golden Signals

---

The four golden signals of monitoring are latency, traffic, errors, and
saturation. If you can only measure four metrics of your user-facing system,
focus on these four.

### Latency

The time it takes to service a request. It's important to distinguish between
the latency of successful requests and the latency of failed requests. For
example, an HTTP 500 error triggered due to loss of connection to a database or
other critical backend might be served very quickly; however, as an HTTP 500
error indicates a failed request, factoring 500s into your overall latency might
result in misleading calculations. On the other hand, a slow error is even worse
than a fast error! Therefore, it's important to track error latency, as opposed
to just filtering out errors.

<!-- markdownlint-disable-next-line -->
{% chart "FROM Transaction SELECT count(\*) WHERE appName = '{{appName}}' TIMESERIES", class="d-block mx-auto" %}{% endchart %}

### Traffic

A measure of how much demand is being placed on your system, measured in a
high-level system-specific metric. For a web service, this measurement is
usually HTTP requests per second, perhaps broken out by the nature of the
requests (e.g., static versus dynamic content). For an audio streaming system,
this measurement might focus on network I/O rate or concurrent sessions. For a
key-value storage system, this measurement might be transactions and retrievals
per second.

<!-- markdownlint-disable-next-line -->
{% chart "FROM Transaction SELECT rate(count(\*), 1 minute) as 'Requests Per Minute' where appName = '{{appName}}' SINCE last week UNTIL this week TIMESERIES", chartType="AREA", class="d-block mx-auto" %}{% endchart %}

### Errors

The rate of requests that fail, either explicitly (e.g., HTTP 500s), implicitly
(for example, an HTTP 200 success response, but coupled with the wrong content),
or by policy (for example, "If you committed to one-second response times, any
request over one second is an error"). Where protocol response codes are
insufficient to express all failure conditions, secondary (internal) protocols
may be necessary to track partial failure modes. Monitoring these cases can be
drastically different: catching HTTP 500s at your load balancer can do a decent
job of catching all completely failed requests, while only end-to-end system
tests can detect that you're serving the wrong content.

<!-- markdownlint-disable-next-line -->
{% chart "from Transaction SELECT percentage(count(\*), WHERE httpResponseCode != 200) as 'Error Percentage' WHERE appName='{{appName}}' SINCE last week UNTIL this week TIMESERIES", class="d-block mx-auto" %}{% endchart %}

### Browser

User Experience

<!-- markdownlint-disable-next-line -->
{% chart "FROM PageView SELECT count(\*) WHERE appName = '{{appName}}' TIMESERIES", class="d-block mx-auto" %}{% endchart %}
