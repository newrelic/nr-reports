package com.newrelic.labs.reports.model;

public class PublishConfigItem {
	private final String scheduleName;
	private final Report report;
	private final String publishConfigId;
	private final String schedule;
	private final boolean enabled;

	public PublishConfigItem(
		String scheduleName,
		Report r,
		String publishConfigId,
		String schedule,
		boolean enabled
	) {
		this.scheduleName = scheduleName;
		this.report = r;
		this.publishConfigId = publishConfigId;
		this.schedule = schedule;
		this.enabled = enabled;
	}

	public String getScheduleName() {
		return this.scheduleName;
	}

	public Report getReport() {
		return this.report;
	}

	public String getPublishConfigId() {
		return this.publishConfigId;
	}

	public String getSchedule() { return this.schedule; }

	public boolean isEnabled() {
		return this.enabled;
	}
}
