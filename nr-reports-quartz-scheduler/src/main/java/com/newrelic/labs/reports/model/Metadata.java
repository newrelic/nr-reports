package com.newrelic.labs.reports.model;

public class Metadata {
	private long lastPolledDate;
	@SuppressWarnings("unused")
	private long lastModifiedDate;

	Metadata() {}

	public long getLastPolledDate() {
		return this.lastPolledDate;
	}

	public long getLastModifiedDate() {
		return this.lastModifiedDate;
	}

	public void setLastPolledDate(long l) {
		this.lastPolledDate = l;
	}
}

