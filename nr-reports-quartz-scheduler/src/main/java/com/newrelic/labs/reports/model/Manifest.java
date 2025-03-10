package com.newrelic.labs.reports.model;

public class Manifest {
	private final Report[] reports;

	public Manifest() {
		this.reports = new Report[0];
	}

	public Report[] getReports() {
		return this.reports;
	}
}

