package com.newrelic.labs.reports;

public class NerdgraphQueryException extends Exception {
	public NerdgraphQueryException(String message) {
		super(message);
	}

	public NerdgraphQueryException(String message, Throwable cause) {
		super(message, cause);
	}
}
