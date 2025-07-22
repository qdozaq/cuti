export function getBashIntegration(): string {
  return `# cuti shell integration for bash
cuti() {
    # Find the real cuti binary (not this function)
    # Use 'command' to bypass the function and get the actual binary
    local cuti_bin="$(command -p which cuti 2>/dev/null || which cuti)"
    
    # Check if user typed exactly "cuti wt" with no other arguments
    if [ "$1" = "wt" ] && [ $# -eq 1 ]; then
        # Call real cuti with special env var
        # Capture only stdout (the path), let stderr (the prompt) go to terminal
        local output
        output="$(CUTI_SHELL_CD=1 command "$cuti_bin" wt 2>&3 3>&-)"
        local exit_code=$?
        
        if [ $exit_code -eq 0 ] && [ -d "$output" ]; then
            cd "$output"
        else
            # If selection was cancelled or errored
            return $exit_code
        fi
    else
        # Pass through all other commands unchanged
        command "$cuti_bin" "$@"
    fi
} 3>&2`;
}

export function getZshIntegration(): string {
  return `# cuti shell integration for zsh
cuti() {
    # Find the real cuti binary (not this function)
    # Use 'command' to bypass the function and get the actual binary
    local cuti_bin="$(command -p which cuti 2>/dev/null || which cuti)"
    
    # Check if user typed exactly "cuti wt" with no other arguments
    if [ "$1" = "wt" ] && [ $# -eq 1 ]; then
        # Call real cuti with special env var
        # Capture only stdout (the path), let stderr (the prompt) go to terminal
        local output
        output="$(CUTI_SHELL_CD=1 command "$cuti_bin" wt 2>&3 3>&-)"
        local exit_code=$?
        
        if [ $exit_code -eq 0 ] && [ -d "$output" ]; then
            cd "$output"
        else
            # If selection was cancelled or errored
            return $exit_code
        fi
    else
        # Pass through all other commands unchanged
        command "$cuti_bin" "$@"
    fi
} 3>&2`;
}

export function getFishIntegration(): string {
  return `# cuti shell integration for fish
function cuti
    # Find the real cuti binary (not this function)
    set -l cuti_bin (command -s cuti)
    
    # Check if user typed exactly "cuti wt" with no other arguments
    if test "$argv[1]" = "wt" -a (count $argv) -eq 1
        # Call real cuti with special env var
        # Capture only stdout (the path), let stderr (the prompt) go to terminal
        set -l output (env CUTI_SHELL_CD=1 command $cuti_bin wt 2>&-)
        set -l exit_code $status
        
        if test $exit_code -eq 0 -a -d "$output"
            cd "$output"
        else
            # If selection was cancelled or errored
            return $exit_code
        end
    else
        # Pass through all other commands unchanged
        command $cuti_bin $argv
    end
end`;
}
