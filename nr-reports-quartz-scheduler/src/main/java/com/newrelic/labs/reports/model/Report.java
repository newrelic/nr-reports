package com.newrelic.labs.reports.model;

public class Report {
	@SuppressWarnings("unused")
	private String id;
	@SuppressWarnings("unused")
	private String name;
	@SuppressWarnings("unused")
	private long lastModifiedDate;
	@SuppressWarnings("unused")
	private PublishConfig[] publishConfigs;
	@SuppressWarnings({"FieldMayBeFinal", "FieldCanBeLocal"})
	private boolean enabled = true;

	Report() {}


	public String getId() {
		return this.id;
	}

	public String getName() {
		return this.name;
	}

	public long getLastModifiedDate() { return this.lastModifiedDate; }

	public PublishConfig[] getPublishConfigs() {
		return this.publishConfigs;
	}

	public boolean isEnabled() {
		return enabled;
	}
}
