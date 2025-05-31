const { motion, AnimatePresence } = Framer; // Destructure from global Framer object

document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app-container');
    const textToSpeakInput = document.getElementById('text-to-speak');
    const speakButton = document.getElementById('speak-button');
    const voiceSelect = document.getElementById('voice-select');
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history-button');
    const statusMessage = document.getElementById('status-message');
    const currentYearSpan = document.getElementById('current-year');

    // Guided Tour Elements
    const guidedTourModal = document.getElementById('guided-tour');
    const tourSteps = document.querySelectorAll('.tour-step');
    const tourNextButtons = document.querySelectorAll('.tour-next-btn');
    const tourPrevButtons = document.querySelectorAll('.tour-prev-btn');
    const tourFinishButton = document.getElementById('tour-finish-btn');

    let speechSynthesis = window.speechSynthesis;
    let voices = [];
    let history = JSON.parse(localStorage.getItem('teluguTTSHistory')) || [];

    // --- Initialization ---
    function initializeApp() {
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
        
        // Framer Motion for Splash Screen
        motion(splashScreen, {
            initial: { opacity: 1 },
            animate: { opacity: 0, transitionEnd: { display: "none" } },
            transition: { duration: 0.5, delay: 2 } // Show splash for 2s, then fade out in 0.5s
        }).then(checkFirstVisit);


        if (!speechSynthesis) {
            statusMessage.textContent = " দুঃখিত, আপনার ব্রাউজার স্পিচ সিন্থেসিস সমর্থন করে না। (Sorry, your browser doesn't support speech synthesis.)";
            speakButton.disabled = true;
            voiceSelect.disabled = true;
            return;
        }

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }

        renderHistory();
        speakButton.addEventListener('click', handleSpeak);
        clearHistoryButton.addEventListener('click', clearHistory);
        
        // Apply Framer Motion to buttons (example)
        // We'll make the existing buttons Framer Motion components
        // This requires more advanced setup if buttons are not direct children or if we want to replace them.
        // For simplicity with existing HTML, we'll add event listeners and can trigger animations manually if needed,
        // or wrap them dynamically. Framer's true power comes from using its components in React/Vue,
        // or by dynamically creating `motion.button` elements.

        // For simple hover/tap, CSS is often enough. Framer is powerful for complex sequences.
        // Let's assume for now CSS handles basic button feedback and Framer handles splash/tour.
    }

    // --- Splash & Guided Tour ---
    function checkFirstVisit() {
        if (!localStorage.getItem('teluguTTSVisited')) {
            showGuidedTour();
        } else {
            showAppContent();
        }
    }

    function showGuidedTour() {
        motion(guidedTourModal, {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0, display: "flex" },
            transition: { duration: 0.5 }
        });
        showTourStep('tour-step-1');
    }

    function showAppContent() {
        if (guidedTourModal.style.display !== "none") {
            motion(guidedTourModal, {
                animate: { opacity: 0, y: 20, transitionEnd: { display: "none" } },
                transition: { duration: 0.3 }
            });
        }
        motion(appContainer, {
            initial: { opacity: 0 },
            animate: { opacity: 1, display: "flex" },
            transition: { duration: 0.5, delay: 0.2 } // Delay slightly after tour/splash
        });
    }

    function showTourStep(stepId) {
        tourSteps.forEach(step => {
            // Use Framer Motion for step transitions
            const isTargetStep = step.id === stepId;
            motion(step, {
                initial: { opacity: 0, x: isTargetStep ? 50 : -50 }, // Animate from different directions
                animate: { opacity: isTargetStep ? 1 : 0, x: 0, display: isTargetStep ? "block" : "none" },
                transition: { duration: 0.4, ease: "easeInOut" }
            });
        });
    }

    tourNextButtons.forEach(button => {
        button.addEventListener('click', () => showTourStep(button.dataset.next));
    });

    tourPrevButtons.forEach(button => {
        button.addEventListener('click', () => showTourStep(button.dataset.prev));
    });

    tourFinishButton.addEventListener('click', () => {
        localStorage.setItem('teluguTTSVisited', 'true');
        showAppContent();
    });


    // --- Speech Synthesis ---
    function loadVoices() {
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = ''; // Clear previous options
        const teluguVoices = voices.filter(voice => voice.lang.startsWith('te'));

        if (teluguVoices.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'తెలుగు వాయిస్ అందుబాటులో లేదు';
            option.value = '';
            voiceSelect.appendChild(option);
            voiceSelect.disabled = true;
             statusMessage.textContent = "మీ సిస్టమ్‌లో తెలుగు వాయిస్ కనుగొనబడలేదు.";
            return;
        }
        
        voiceSelect.disabled = false;
        teluguVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;
            voiceSelect.appendChild(option);
        });
        // Automatically select the first available Telugu voice
        if (voiceSelect.options.length > 0) {
             voiceSelect.selectedIndex = 0;
        }
    }

    function handleSpeak() {
        const text = textToSpeakInput.value.trim();
        if (!text) {
            showStatus("దయచేసి మాట్లాడటానికి కొంత వచనాన్ని నమోదు చేయండి.", "error");
            return;
        }
        if (speechSynthesis.speaking) {
            showStatus("ప్రస్తుతం మాట్లాడుతోంది... దయచేసి వేచి ఉండండి.", "info");
            return; // Don't interrupt if already speaking
        }

        speakButton.disabled = true;
        speakButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> మాట్లాడుతోంది...';

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = voiceSelect.value;
        
        if (selectedVoiceName) {
            utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
        }
        // Ensure language is set for better pronunciation if no specific voice is selected
        // or if the selected voice doesn't inherently set the correct lang sub-tag.
        if (!utterance.voice || !utterance.voice.lang.startsWith('te')) {
             utterance.lang = 'te-IN';
        }


        utterance.onstart = () => {
            showStatus("మాట్లాడటం ప్రారంభించబడింది...", "info");
        };

        utterance.onend = () => {
            addToHistory(text);
            showStatus("మాట్లాడటం పూర్తయింది.", "success");
            speakButton.disabled = false;
            speakButton.innerHTML = '<i class="fas fa-play"></i> మాట్లాడండి';
        };

        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            let errorMsg = "క్షమించండి, ఒక లోపం సంభవించింది: " + event.error;
            if (event.error === 'network') {
                errorMsg = "నెట్‌వర్క్ లోపం. కొన్ని వాయిస్‌లకు ఇంటర్నెట్ కనెక్షన్ అవసరం.";
            } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                errorMsg = "స్పీచ్ సింథసిస్ అనుమతించబడలేదు. మీ బ్రౌజర్ సెట్టింగ్‌లను తనిఖీ చేయండి.";
            } else if (event.error === 'language-unavailable' || event.error === 'voice-unavailable') {
                 errorMsg = "ఎంచుకున్న భాష లేదా వాయిస్ అందుబాటులో లేదు.";
            }
            showStatus(errorMsg, "error");
            speakButton.disabled = false;
            speakButton.innerHTML = '<i class="fas fa-play"></i> మాట్లాడండి';
        };

        speechSynthesis.speak(utterance);
    }

    // --- History Management ---
    function addToHistory(text) {
        if (history.length >= 15) { // Limit history size
            history.pop();
        }
        if (!history.includes(text)) { // Avoid duplicates if desired
             history.unshift(text); // Add to the beginning
        }
        localStorage.setItem('teluguTTSHistory', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (history.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'చరిత్ర ఖాళీగా ఉంది.';
            li.style.textAlign = 'center';
            li.style.cursor = 'default';
            historyList.appendChild(li);
            clearHistoryButton.style.display = 'none';
            return;
        }
        
        clearHistoryButton.style.display = 'block';
        history.forEach((text, index) => {
            const li = document.createElement('li');
            
            const textSpan = document.createElement('span');
            textSpan.className = 'history-text';
            textSpan.textContent = text;
            textSpan.title = "Replay: " + text;
            textSpan.addEventListener('click', () => replayHistoryItem(text));

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = "Delete this item";
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent li click event
                deleteHistoryItem(index);
            });

            actionsDiv.appendChild(deleteBtn);
            li.appendChild(textSpan);
            li.appendChild(actionsDiv);
            historyList.appendChild(li);
        });
    }

    function replayHistoryItem(text) {
        textToSpeakInput.value = text;
        handleSpeak();
    }
    
    function deleteHistoryItem(index) {
        history.splice(index, 1);
        localStorage.setItem('teluguTTSHistory', JSON.stringify(history));
        renderHistory();
        showStatus("చరిత్ర అంశం తొలగించబడింది.", "info");
    }

    function clearHistory() {
        if (confirm("మీరు మొత్తం చరిత్రను క్లియర్ చేయాలనుకుంటున్నారా?")) {
            history = [];
            localStorage.removeItem('teluguTTSHistory');
            renderHistory();
            showStatus("చరిత్ర క్లియర్ చేయబడింది.", "success");
        }
    }

    // --- Utility Functions ---
    function showStatus(message, type = "info") {
        statusMessage.textContent = message;
        statusMessage.className = `status ${type}`; // types: info, success, error
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'status';
        }, 4000);
    }

    // Apply Framer Motion to buttons
    // Note: This is a simplified way. For complex Framer usage,
    // you'd typically build your UI with Framer components from the start (e.g., in React).
    // Here, we're adding behavior to existing HTML elements.
    const buttonsToAnimate = [speakButton, clearHistoryButton, ...document.querySelectorAll('.tour-content button')];
    buttonsToAnimate.forEach(btn => {
        if (!btn) return;
        // Applying Framer Motion dynamically like this has limitations.
        // CSS transitions are more straightforward for simple hover/tap on static HTML.
        // For Framer's full power, it's best used in a component-based framework or by generating elements with it.
        // However, we can set initial styles and use Framer to animate them on events if needed.
        // Example: Change scale on hover using JS + Framer (more verbose than CSS)
        // btn.addEventListener('mouseenter', () => motion(btn, { scale: 1.05 }, { duration: 0.1 }));
        // btn.addEventListener('mouseleave', () => motion(btn, { scale: 1 }, { duration: 0.1 }));
        // For now, CSS handles hover/active states well for standard buttons.
    });


    // Start the application
    initializeApp();
});
