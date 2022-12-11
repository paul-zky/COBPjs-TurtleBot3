package roscobp;

import edu.wpi.rail.jrosbridge.callback.TopicCallback;
import edu.wpi.rail.jrosbridge.services.ServiceResponse;
import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;

import java.util.Map;
import java.util.Properties;

public class RosBridgeDummy {
    public RosBridgeDummy(BProgram bProgram, BProgramRunner rnr) {
    }

    public void publish(String topic, String message) {
    }

    public void advertise(String topic, String eventName) {
    }

    private void subscribe(String topic, TopicCallback callback) {
    }

    public void subscribe(String topic) {
    }

    public ServiceResponse callServiceAndWait(String service, String request) {
        return null;
    }

    public void addTopic(String name, String type) {
    }

    public void addTopic(String name, String type, Map<?, ?> additionalParameters) {
    }

    public void addTopic(String name, String type, Properties additionalParameters) {
    }

    public void addService(String name, String service) {
    }

    private void connect() {
    }

    public void disconnect() {
    }

    public void sampleData() {
    }
}
