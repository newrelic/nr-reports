package com.newrelic.labs.reports.model;

public class PublishConfig {
	@SuppressWarnings("unused")
	private String id;
	@SuppressWarnings("unused")
	private String schedule;
	@SuppressWarnings({"FieldMayBeFinal", "FieldCanBeLocal"})
	private boolean enabled = true;

	PublishConfig() {}

	public String getId() {
		return this.id;
	}

	public String getSchedule() {
		return this.schedule;
	}

	public boolean isEnabled() {
		return this.enabled;
	}
}
