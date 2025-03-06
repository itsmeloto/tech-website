document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const calendarEl = document.getElementById('calendar');111
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const meetingList = document.getElementById('meetingList');
    const meetingModal = document.getElementById('meetingModal');
    const meetingForm = document.getElementById('meetingForm');
    const closeModal = document.getElementById('closeModal');
    const cancelButton = document.getElementById('cancelButton');
    const voiceButton = document.getElementById('voiceButton');
    const feedbackText = document.getElementById('feedbackText');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const modalTitle = document.getElementById('modalTitle');
    const singleViewBtn = document.getElementById('singleViewBtn');
    const multiViewBtn = document.getElementById('multiViewBtn');
    const singleView = document.getElementById('singleView');
    const multiView = document.getElementById('multiView');
    const todayDay = document.getElementById('todayDay');
    const todayWeekday = document.getElementById('todayWeekday');
    const todayMonthYear = document.getElementById('todayMonthYear');
    const todayClock = document.getElementById('todayClock');
    const todaySchedule = document.getElementById('todaySchedule');
    const todayWeather = document.getElementById('todayWeather');
    
    // Form elements
    const meetingIdInput = document.getElementById('meetingId');
    const meetingNameInput = document.getElementById('meetingName');
    const meetingDateInput = document.getElementById('meetingDate');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const alarmTimeInput = document.getElementById('alarmTime');

    // Initialize meetings array from localStorage or empty array
    let meetings = JSON.parse(localStorage.getItem('meetings')) || [];
    
    // Initialize alarms
    let alarms = {};
    
    // Voice recognition variables
    let recognition = null;
    let isListening = false;

    // Check if speech recognition is available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = function(event) {
            const command = event.results[0][0].transcript.toLowerCase();
            processVoiceCommand(command);
        };
        
        recognition.onend = function() {
            if (isListening) {
                voiceButton.classList.remove('listening');
                isListening = false;
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            voiceButton.classList.remove('listening');
            isListening = false;
            showFeedback('Sorry, I could not understand that. Please try again.');
        };
    }

    // Initialize calendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        eventColor: '#6200ea',
        events: meetings.map(formatMeetingForCalendar),
        select: function(info) {
            openAddMeetingModal(info.startStr);
        },
        eventClick: function(info) {
            const meeting = meetings.find(m => m.id === info.event.id);
            if (meeting) {
                openEditMeetingModal(meeting);
            }
        },
        // Add animation for events
        eventDidMount: function(info) {
            info.el.style.animation = 'scaleUp 0.3s forwards';
        }
    });
    
    calendar.render();
    renderMeetingList();
    updateTodayView();
    updateClock();
    setInterval(updateClock, 1000); // Update clock every second
    fetchMockWeather(); // Fetch mock weather data
    checkAlarmsOnLoad();

    // Event listeners
    menuButton.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeOverlays);
    closeModal.addEventListener('click', closeModalHandler);
    cancelButton.addEventListener('click', closeModalHandler);
    meetingForm.addEventListener('submit', handleMeetingFormSubmit);
    voiceButton.addEventListener('click', toggleVoiceRecognition);
    singleViewBtn.addEventListener('click', switchToSingleView);
    multiViewBtn.addEventListener('click', switchToMultiView);
    
    // View switching functions
    function switchToSingleView() {
        singleViewBtn.classList.add('active');
        multiViewBtn.classList.remove('active');
        
        // Animate transition
        multiView.style.opacity = 0;
        multiView.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            multiView.classList.add('hidden');
            singleView.classList.remove('hidden');
            
            // Reset and animate single view
            singleView.style.opacity = 0;
            singleView.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                singleView.style.opacity = 1;
                singleView.style.transform = 'translateY(0)';
                updateTodayView(); // Refresh today view data
            }, 50);
        }, 300);
    }
    
    function switchToMultiView() {
        multiViewBtn.classList.add('active');
        singleViewBtn.classList.remove('active');
        
        // Animate transition
        singleView.style.opacity = 0;
        singleView.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            singleView.classList.add('hidden');
            multiView.classList.remove('hidden');
            
            // Reset and animate multi view
            multiView.style.opacity = 0;
            multiView.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                multiView.style.opacity = 1;
                multiView.style.transform = 'translateY(0)';
                calendar.render(); // Re-render calendar
            }, 50);
        }, 300);
    }
    
    // Format meeting for calendar display
    function formatMeetingForCalendar(meeting) {
        return {
            id: meeting.id,
            title: meeting.name,
            start: `${meeting.date}T${meeting.startTime}`,
            end: `${meeting.date}T${meeting.endTime}`
        };
    }
    
    // Open modal to add a new meeting
    function openAddMeetingModal(dateStr) {
        modalTitle.textContent = 'Add New Meeting';
        meetingForm.reset();
        meetingIdInput.value = '';
        
        // If a date is provided, set it in the form
        if (dateStr) {
            meetingDateInput.value = dateStr;
        } else {
            // Set today's date as default
            const today = new Date().toISOString().split('T')[0];
            meetingDateInput.value = today;
        }
        
        // Set default times
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        startTimeInput.value = `${hours}:${minutes}`;
        
        // Set end time to 1 hour after start time
        const endHour = (parseInt(hours) + 1) % 24;
        endTimeInput.value = `${endHour.toString().padStart(2, '0')}:${minutes}`;
        
        // Open modal
        openModal();
    }
    
    // Open modal to edit an existing meeting
    function openEditMeetingModal(meeting) {
        modalTitle.textContent = 'Edit Meeting';
        
        // Fill form with meeting data
        meetingIdInput.value = meeting.id;
        meetingNameInput.value = meeting.name;
        meetingDateInput.value = meeting.date;
        startTimeInput.value = meeting.startTime;
        endTimeInput.value = meeting.endTime;
        alarmTimeInput.value = meeting.alarmMinutes || '0';
        
        // Open modal
        openModal();
    }
    
    // Open modal
    function openModal() {
        meetingModal.classList.add('active');
        overlay.classList.add('active');
    }
    
    // Close modal
    function closeModalHandler() {
        meetingModal.classList.remove('active');
        overlay.classList.remove('active');
    }
    
    // Toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
    
    // Close all overlays
    function closeOverlays() {
        sidebar.classList.remove('open');
        meetingModal.classList.remove('active');
        overlay.classList.remove('active');
    }
    
    // Handle form submission
    function handleMeetingFormSubmit(e) {
        e.preventDefault();
        
        // Get form values
        const meetingId = meetingIdInput.value;
        const name = meetingNameInput.value;
        const date = meetingDateInput.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        const alarmMinutes = parseInt(alarmTimeInput.value) || 0;
        
        // Validate time range
        if (startTime >= endTime) {
            showFeedback('End time must be after start time');
            return;
        }
        
        // Create meeting object
        const meeting = {
            name,
            date,
            startTime,
            endTime,
            alarmMinutes
        };
        
        if (meetingId) {
            // Update existing meeting
            meeting.id = meetingId;
            const index = meetings.findIndex(m => m.id === meetingId);
            if (index !== -1) {
                meetings[index] = meeting;
                // Reschedule alarm if needed
                clearAlarm(meetingId);
                if (alarmMinutes > 0) {
                    scheduleAlarm(meeting);
                }
                showToast('Meeting updated successfully');
            }
        } else {
            // Add new meeting
            meeting.id = Date.now().toString();
            meetings.push(meeting);
            if (alarmMinutes > 0) {
                scheduleAlarm(meeting);
            }
            showToast('Meeting added successfully');
        }
        
        // Save to localStorage
        localStorage.setItem('meetings', JSON.stringify(meetings));
        
        // Update UI
        calendar.removeAllEvents();
        calendar.addEventSource(meetings.map(formatMeetingForCalendar));
        renderMeetingList();
        updateTodayView();
        
        // Close modal
        closeModalHandler();
    }
    
    // Delete meeting
    function deleteMeeting(id) {
        const confirmed = confirm('Are you sure you want to delete this meeting?');
        if (confirmed) {
            // Find and remove meeting
            const index = meetings.findIndex(m => m.id === id);
            if (index !== -1) {
                meetings.splice(index, 1);
                
                // Clear alarm
                clearAlarm(id);
                
                // Save to localStorage
                localStorage.setItem('meetings', JSON.stringify(meetings));
                
                // Update UI
                calendar.removeAllEvents();
                calendar.addEventSource(meetings.map(formatMeetingForCalendar));
                renderMeetingList();
                updateTodayView();
                
                showToast('Meeting deleted successfully');
            }
        }
    }
    
    // Render meeting list in sidebar
    function renderMeetingList() {
        // Sort meetings by date and time
        const sortedMeetings = [...meetings].sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            return a.startTime.localeCompare(b.startTime);
        });
        
        // Clear list
        meetingList.innerHTML = '';
        
        // Add meetings to list
        if (sortedMeetings.length === 0) {
            meetingList.innerHTML = '<li class="meeting-item">No meetings scheduled</li>';
        } else {
            sortedMeetings.forEach(meeting => {
                const meetingItem = document.createElement('li');
                meetingItem.className = 'meeting-item';
                
                // Format date
                const meetingDate = new Date(meeting.date);
                const formattedDate = meetingDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                
                meetingItem.innerHTML = `
                    <h4 class="meeting-title">${meeting.name}</h4>
                    <div class="meeting-time">
                        <i class="far fa-calendar-alt"></i>
                        ${formattedDate} | ${formatTimeForDisplay(meeting.startTime)} - ${formatTimeForDisplay(meeting.endTime)}
                    </div>
                    <div class="meeting-actions">
                        <button class="edit-btn" data-id="${meeting.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-btn" data-id="${meeting.id}">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                        ${meeting.alarmMinutes > 0 ? `
                            <button class="alarm-btn" data-id="${meeting.id}">
                                <i class="fas fa-bell"></i> ${meeting.alarmMinutes}m
                            </button>
                        ` : ''}
                    </div>
                `;
                
                // Add event listeners
                const editBtn = meetingItem.querySelector('.edit-btn');
                const deleteBtn = meetingItem.querySelector('.delete-btn');
                
                editBtn.addEventListener('click', () => {
                    const meeting = meetings.find(m => m.id === editBtn.dataset.id);
                    if (meeting) {
                        openEditMeetingModal(meeting);
                    }
                });
                
                deleteBtn.addEventListener('click', () => {
                    deleteMeeting(deleteBtn.dataset.id);
                });
                
                meetingList.appendChild(meetingItem);
            });
        }
    }
    
    // Format time for display
    function formatTimeForDisplay(timeString) {
        const [hours, minutes] = timeString.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minutes} ${ampm}`;
    }
    
    // Update today view
    function updateTodayView() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        // Update date display
        todayDay.textContent = now.getDate();
        todayWeekday.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
        todayMonthYear.textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        // Filter today's meetings
        const todayMeetings = meetings.filter(meeting => meeting.date === todayStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Update today's schedule
        todaySchedule.innerHTML = '';
        
        if (todayMeetings.length === 0) {
            todaySchedule.innerHTML = '<div class="schedule-item">No meetings scheduled for today</div>';
        } else {
            todayMeetings.forEach(meeting => {
                const scheduleItem = document.createElement('div');
                scheduleItem.className = 'schedule-item';
                
                scheduleItem.innerHTML = `
                    <div class="schedule-time">${formatTimeForDisplay(meeting.startTime)}</div>
                    <div class="schedule-info">
                        <div class="schedule-title">${meeting.name}</div>
                        <div class="schedule-duration">${formatTimeForDisplay(meeting.startTime)} - ${formatTimeForDisplay(meeting.endTime)}</div>
                    </div>
                    <div class="schedule-actions">
                        <button class="edit-today-btn" data-id="${meeting.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-today-btn" data-id="${meeting.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                
                // Add event listeners
                const editBtn = scheduleItem.querySelector('.edit-today-btn');
                const deleteBtn = scheduleItem.querySelector('.delete-today-btn');
                
                editBtn.addEventListener('click', () => {
                    const meeting = meetings.find(m => m.id === editBtn.dataset.id);
                    if (meeting) {
                        openEditMeetingModal(meeting);
                    }
                });
                
                deleteBtn.addEventListener('click', () => {
                    deleteMeeting(deleteBtn.dataset.id);
                });
                
                todaySchedule.appendChild(scheduleItem);
            });
        }
    }
    
    // Update clock
    function updateClock() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        todayClock.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    // Schedule an alarm
    function scheduleAlarm(meeting) {
        if (!meeting.alarmMinutes || meeting.alarmMinutes <= 0) return;
        
        // Calculate alarm time
        const meetingDateTime = new Date(`${meeting.date}T${meeting.startTime}`);
        const alarmTime = new Date(meetingDateTime.getTime() - (meeting.alarmMinutes * 60000));
        
        // Don't schedule if time has passed
        if (alarmTime <= new Date()) return;
        
        // Set timeout
        const timeUntilAlarm = alarmTime.getTime() - new Date().getTime();
        const alarmId = setTimeout(() => {
            triggerAlarm(meeting);
        }, timeUntilAlarm);
        
        // Store alarm ID
        alarms[meeting.id] = alarmId;
    }
    
    // Clear an alarm
    function clearAlarm(meetingId) {
        if (alarms[meetingId]) {
            clearTimeout(alarms[meetingId]);
            delete alarms[meetingId];
        }
    }
    
    // Trigger an alarm
    function triggerAlarm(meeting) {
        // Play a notification sound if available
        try {
            const audio = new Audio('notification.mp3');
            audio.play();
        } catch (error) {
            console.warn('Could not play notification sound', error);
        }
        
        // Show a notification
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Meeting Reminder', {
                body: `${meeting.name} starts in ${meeting.alarmMinutes} minutes`,
                icon: 'favicon.ico'
            });
            
            notification.onclick = function() {
                window.focus();
                this.close();
            };
        } else {
            showToast(`Reminder: ${meeting.name} starts in ${meeting.alarmMinutes} minutes`);
        }
    }
    
    // Check alarms on page load
    function checkAlarmsOnLoad() {
        meetings.forEach(meeting => {
            if (meeting.alarmMinutes > 0) {
                scheduleAlarm(meeting);
            }
        });
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    // Toggle voice recognition
    function toggleVoiceRecognition() {
        if (!recognition) {
            showFeedback('Speech recognition is not supported in your browser');
            return;
        }
        
        if (isListening) {
            recognition.stop();
            voiceButton.classList.remove('listening');
            isListening = false;
        } else {
            recognition.start();
            voiceButton.classList.add('listening');
            isListening = true;
            showFeedback('Listening...');
        }
    }
    
    // Process voice command
    function processVoiceCommand(command) {
        showFeedback(`Command received: "${command}"`);
        
        // Common date-related words
        const dateKeywords = {
            'today': new Date().toISOString().split('T')[0],
            'tomorrow': (() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow.toISOString().split('T')[0];
            })()
        };
        
        // Add meeting command
        if (command.includes('add meeting') || command.includes('new meeting') || command.includes('create meeting')) {
            // Extract date
            let date = null;
            for (const [keyword, value] of Object.entries(dateKeywords)) {
                if (command.includes(keyword)) {
                    date = value;
                    break;
                }
            }
            
            // Extract time using regex
            const timeRegex = /at\s+(\d+)(?::(\d+))?\s*(am|pm)?/i;
            const timeMatch = command.match(timeRegex);
            
            let startTime = null;
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
                
                // Adjust hours for PM
                if (ampm === 'pm' && hours < 12) {
                    hours += 12;
                } else if (ampm === 'am' && hours === 12) {
                    hours = 0;
                }
                
                startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
            
            // Extract name after "called" or "titled"
            let name = 'New Meeting';
            const nameMatch = command.match(/(?:called|titled|named)\s+(.+?)(?:\s+at|$)/i);
            if (nameMatch) {
                name = nameMatch[1];
            }
            
            // Open modal with extracted information
            openAddMeetingModal(date);
            
            // Fill in the extracted data
            meetingNameInput.value = name;
            if (startTime) {
                startTimeInput.value = startTime;
                
                // Set end time to 1 hour after start time
                const [hours, minutes] = startTime.split(':');
                const endHour = (parseInt(hours) + 1) % 24;
                endTimeInput.value = `${endHour.toString().padStart(2, '0')}:${minutes}`;
            }
            
            showFeedback('Please complete the meeting details');
            return;
        }
        
        // Show today's meetings
        if (command.includes('show today') || command.includes('today\'s meetings') || command.includes('meetings today')) {
            switchToSingleView();
            showFeedback('Showing today\'s meetings');
            return;
        }
        
        // Show calendar view
        if (command.includes('show calendar') || command.includes('calendar view') || command.includes('month view')) {
            switchToMultiView();
            showFeedback('Showing calendar view');
            return;
        }
        
        // Open meetings list
        if (command.includes('show meetings') || command.includes('open meetings') || command.includes('list meetings')) {
            toggleSidebar();
            showFeedback('Opening meetings list');
            return;
        }
        
        // Fallback for unrecognized commands
        showFeedback('Sorry, I didn\'t understand that command');
    }
    
    // Show feedback text
    function showFeedback(message) {
        feedbackText.textContent = message;
        feedbackText.style.opacity = 1;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            feedbackText.style.opacity = 0;
            setTimeout(() => {
                feedbackText.textContent = '';
            }, 300);
        }, 5000);
    }
    
    // Show toast notification
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Fetch mock weather data
    function fetchMockWeather() {
        // In a real app, you would fetch weather from an API
        // This is just a simple mock implementation
        const weatherIcons = ['fa-sun', 'fa-cloud', 'fa-cloud-sun', 'fa-cloud-rain', 'fa-snowflake'];
        const temperatures = [18, 20, 22, 24, 26, 28];
        
        // Randomly select weather
        const randomIcon = weatherIcons[Math.floor(Math.random() * weatherIcons.length)];
        const randomTemp = temperatures[Math.floor(Math.random() * temperatures.length)];
        
        // Update weather display
        todayWeather.innerHTML = `${randomTemp}°C`;
        const weatherIconEl = todayWeather.previousElementSibling;
        
        // Remove existing icon classes
        weatherIcons.forEach(icon => {
            weatherIconEl.classList.remove(icon);
        });
        
        // Add new icon class
        weatherIconEl.classList.add(randomIcon);
    }
});