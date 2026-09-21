
    // Normalize model formatting before saving or returning it to the UI.
    responseText = cleanAIResponse(responseText);

    // 3. Update session in memory
    sessionData.state = updatedState;
    sessionData.messages.push(
      { sender: 'user', content: trimmedMsg, time: new Date().toISOString() },
      { sender: 'ai', content: responseText, time: new Date().toISOString() }
    );
    inMemorySessions.set(currentSessionId, sessionData);

    // 4. Safely persist to Supabase if available
    if (supabase) {
      try {
        if (!sessionId && userId) {
          await supabase.from('chat_sessions').insert({
            id: currentSessionId,
            user_id: userId,