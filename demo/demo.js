require({
    paths: {
        harmonizr: 'lib/harmonizr',
        esprima: '../lib/esprima',
        jquery: 'lib/jquery-1.7.2',
        codemirror: 'lib/codemirror',
        codemirrorjavascript: 'lib/javascript'
    },
    shim: {
        esprima: {
            exports: 'esprima'
        },
        codemirror: {
            exports: 'CodeMirror'
        },
        codemirrorjavascript: {
            deps: ['codemirror']
        }
    }
}, [
    'harmonizr',
    'jquery',
    'codemirror',
    'codemirrorjavascript'
], function(harmonizr, $, CodeMirror) {

    $(function() {
        var editor = CodeMirror($('#editor')[0], {
            lineNumbers: true,
            matchBrackets: true,
            autofocus: true,
            onCursorActivity: cursorChanged,
            onChange: codeChanged,
            extraKeys: {
                'Esc': function() { $('#styles').focus(); }
            }
        });

        var result = CodeMirror($('#result')[0], {
            lineNumbers: true,
            matchBrackets: true,
            readOnly: true,
            onCursorActivity: cursorChanged,
            extraKeys: {
                'Esc': function() { editor.focus(); }
            }
        });

        function cursorChanged(e) {
            clearHighlights();
            highlightLines(e.getCursor().line);
        }

        var highlightClass = 'currentLine';
        var highlightIndex = -1;

        function highlightLines(lineNumber) {
            if (lineNumber < 0) return;
            highlightIndex = lineNumber;
            editor.setLineClass(highlightIndex, null, highlightClass);
            result.setLineClass(highlightIndex, null, highlightClass);
        }

        function clearHighlights() {
            if (highlightIndex !== -1) {
                editor.setLineClass(highlightIndex, null, null);
                result.setLineClass(highlightIndex, null, null);
                highlightIndex = -1;
            }
        }

        function codeChanged() {
            try {
                var code = editor.getValue();
                var ast = esprima.parse(code);
                run();
                showResult();
            } catch (e) {
                showError(e.message);
            }
        }

        function run() {
            var src = editor.getValue();
            var result = harmonizr.harmonize(src, {
                style: $('#styles').val(),
                module: $('#module').val(),
                relatives: ($('#relatives').val() || '').split(',')
            });
            setResult(result);
        }

        function setResult(src) {
            // Remember what lines are highlighted.
            var currentLine = highlightIndex;
            // Clear the existing highlights.
            clearHighlights();
            // Calling setValue() triggers onCursorActivity.
            result.setValue(src);
            // Clear the highlights created by setValue().
            clearHighlights();
            // Restore the original highlights.
            highlightLines(currentLine);
        }

        function showResult() {
            $('#result').show();
            $('#error').hide().empty();
            result.refresh();
        }

        function showError(msg) {
            $('#error').html(msg).show();
            $('#result').hide();
        }

        $('#styles, #module, #relatives').on('change input', run);

        var src = $('script[type=example]').text();
        editor.setValue(src.replace(/^\s*\r?\n|\r?\n\s*$/g, ''));

        run();
        highlightLines(0);
    });

});