package com.newrelic.labs.reports;

public class RunReportException extends Exception {
	public RunReportException(String message) {
		super(message);
	}

	public RunReportException(String message, Throwable cause) {
		super(message, cause);
	}
}
