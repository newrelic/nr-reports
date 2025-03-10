package com.newrelic.labs.reports;

public class SyncException extends Exception {
	public SyncException(String message) {
		super(message);
	}

	public SyncException(String message, Throwable cause) {
		super(message, cause);
	}
}
