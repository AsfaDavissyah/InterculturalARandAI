class PendingTurn {
  String? text;
  bool sending = false;

  bool begin(String response) {
    if (sending || response.trim().isEmpty) return false;
    if (text != null && text != response) return false;
    text = response;
    sending = true;
    return true;
  }

  void accept() => text = null;

  void finishAttempt() => sending = false;
}
