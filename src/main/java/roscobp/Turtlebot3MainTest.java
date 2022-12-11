package roscobp;

import il.ac.bgu.cs.bp.bpjs.analysis.DfsBProgramVerifier;
import il.ac.bgu.cs.bp.bpjs.analysis.ExecutionTrace;
import il.ac.bgu.cs.bp.bpjs.analysis.VerificationResult;
import il.ac.bgu.cs.bp.bpjs.analysis.listeners.PrintDfsVerifierListener;
import il.ac.bgu.cs.bp.bpjs.context.ContextBProgram;
import il.ac.bgu.cs.bp.bpjs.execution.BProgramRunner;
import il.ac.bgu.cs.bp.bpjs.execution.listeners.BProgramRunnerListenerAdapter;
import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgram;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.PrioritizedBSyncEventSelectionStrategy;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.fail;

/* This class contains examples that demonstrate how unit tests could be used to test COBPjs programs.
*/
class Turtlebot3MainTest {
    RosBridgeDummy rosBridgeDummy;
    BProgram bprog;
    BProgramRunner rnr;

    // this method sets up the COBPjs program
    void setUp() {
        rnr = new BProgramRunner(bprog);
        PrioritizedBSyncEventSelectionStrategy eventSelStrat = new PrioritizedBSyncEventSelectionStrategy();
        /* sets the priority of events that have no explicitly stated priority value to 0. This allows for events that
        are only selected when there are no other events available by assigning them a negative.
        Normally the default priority is Integer.MIN_VALUE.
        */
        eventSelStrat.setDefaultPriority(0);
        bprog.setEventSelectionStrategy(eventSelStrat);

        // Uses a dummy with empty methods. The simulation of data events is done by B-Threads inside the COBPjs program
        rosBridgeDummy = new RosBridgeDummy(bprog, rnr);
        bprog.putInGlobalScope("ros", rosBridgeDummy);

        /* The actual test for errors and faulty behavior are done inside the COBPjs application by assert statements.
        If an assertion fails the listener is notified and causes the test to fail and displays the assertion message.
        */
        rnr.addListener(new BProgramRunnerListenerAdapter() {
            @Override
            public void assertionFailed(BProgram bp, il.ac.bgu.cs.bp.bpjs.model.SafetyViolationTag failedAssertion) {
                fail(failedAssertion.getMessage());
            }
        });

        /* listeners can also be used to monitor specific events and perform actions accordingly.
        In this case whenever the "TargetReached"-event is selected, the corresponding coordinates are printed to
        the console.
        */
        rnr.addListener(new BProgramRunnerListenerAdapter() {
            @Override
            public void eventSelected(BProgram bp, BEvent event) {
                if (event.name.equals("TargetReached")) {
                    System.out.println(event.getData());
                }
            }
        });
    }

    @Test
    void deliveryTest() {
        // initializes the COBPjs program with the application files as well as an additional test file
        bprog = new ContextBProgram("test/cobp_sim.dal.js", "test/cobp_sim.bl.js", "test/cobp_sim.test.js");
        // calls the setup method
        setUp();
        // executes the program and thereby the tests
        rnr.run();
    }

    /* This test demonstrates how external events can be added into a running COBPjs program by using another thread to
    enqueue the event into the external event queue.
    Note: bprog.enqueueExternalEvent() can also be used before rnr.run() without using another thread. The event is then
    available in the external event queue when the program is started.
    */
    @Test
    void addDeliveryTest() {
        bprog = new ContextBProgram("test/cobp_sim.dal.js", "test/cobp_sim.bl.js", "test/cobp_sim.test.js", "test/cobp_sim.test_external_events.js");
        setUp();
        bprog.setWaitForExternalEvents(true);

        // example message to add a new delivery order
        String newDelivery =  "{\"poses\": [{\"position\": {\"x\": 1.0, \"y\": 1.0}}, {\"position\": {\"x\": 2.0, \"y\": 2.0}}]}";

        new Thread(() -> {
            try {
                Thread.sleep(500);
                bprog.enqueueExternalEvent(new BEvent("/add_del", newDelivery));
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }).start();

        rnr.run();
    }

    /* This test demonstrates the model checker. In the following example, the collision avoidance functionality of the
    application is checked by randomly blocking the movement in certain directions. If a violation is found, the
    violation as well as the event trace that caused it will be printed to the console.
    In this case the model checker will detect a deadlock because it is possible for movement in all possible directions
    to be blocked and thereby preventing further action even though the movement is still requested. This however is not
    unexpected behavior since a roboter that is blocked on all sides should halt its movement. So what might be
    considered a deadlock by the model checker might very well be desired behavior.
    */
    @Test
    void ModelChecker() throws Exception {
        bprog = new ContextBProgram("collision-avoidance-model-check/cobp_sim.dal.js", "collision-avoidance-model-check/cobp_sim.bl.js");

        bprog.setEventSelectionStrategy(new PrioritizedBSyncEventSelectionStrategy());

        DfsBProgramVerifier vrf = new DfsBProgramVerifier();
        vrf.setProgressListener(new PrintDfsVerifierListener());

        rosBridgeDummy = new RosBridgeDummy(bprog, rnr);
        bprog.putInGlobalScope("ros", rosBridgeDummy);

        VerificationResult res = vrf.verify(bprog);

        if (res.isViolationFound()) {
            System.out.println("Found a counterexample:");
            for (ExecutionTrace.Entry entry : res.getViolation().get().getCounterExampleTrace().getNodes()) {
                System.out.println(" " + entry.getEvent());
            }
        } else {
            System.out.println("No counterexamples found.");
        }
    }
}
