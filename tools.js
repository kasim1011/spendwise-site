/*
 * Spendwise site — the three free calculators.
 *
 * One script for /50-30-20-budget-calculator, /split-bill-calculator and
 * /subscription-cost-calculator. No dependencies, no third-party calls, no
 * storage. Every figure is computed in integer cents, the same rule the app uses,
 * so a displayed total never drifts by a cent from the sum of its parts.
 *
 * Without JavaScript the pages still explain the maths and the calculator block
 * carries a <noscript> note; nothing here is required to read the page.
 */
(function () {
  'use strict';

  /*
   * The page language is the contract: a German page formats 2.000,00 even in an English browser.
   * Arabic keeps Western digits here, matching the screenshots and the rest of the site.
   */
  var lang = document.documentElement.lang || undefined;
  if (lang && lang.indexOf('ar') === 0) lang += '-u-nu-latn';

  var money = new Intl.NumberFormat(lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function cents(value) {
    var n = Number(value);
    if (!isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }

  function format(value) {
    return money.format(value / 100);
  }

  function set(form, name, value) {
    var node = form.querySelector('[data-out="' + name + '"]');
    if (node) node.textContent = value;
  }

  /*
   * The split sentence is the only string the script has to write, so it lives in the page as
   * `data-msg-*` templates with `{placeholders}`. Translation stays in the markup, where the rest
   * of the copy is; this helper only fills the numbers in.
   */
  function message(form, name, values) {
    var template = form.getAttribute('data-' + name) || '';
    return template.replace(/\{(\w+)\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  /* ---------- 50/30/20 budget ---------- */

  function budget(form) {
    var income = cents(form.elements.income.value);
    var needs = Math.round((income * 50) / 100);
    var wants = Math.round((income * 30) / 100);
    var savings = income - needs - wants;

    set(form, 'needs', format(needs));
    set(form, 'wants', format(wants));
    set(form, 'savings', format(savings));
    set(form, 'day', format(Math.round(income / 30)));
  }

  /* ---------- Split bill ---------- */

  function split(form) {
    var bill = cents(form.elements.bill.value);
    var tipPercent = Math.min(100, Math.max(0, Number(form.elements.tip.value) || 0));
    var people = Math.min(99, Math.max(1, Math.round(Number(form.elements.people.value) || 1)));

    var tip = Math.round((bill * tipPercent) / 100);
    var total = bill + tip;
    var each = Math.floor(total / people);
    var remainder = total - each * people;

    set(form, 'tip', format(tip));
    set(form, 'total', format(total));
    set(form, 'each', format(each));
    set(form, 'high', format(each + (remainder > 0 ? 1 : 0)));

    var note = form.querySelector('[data-note="split"]');
    if (note) {
      note.textContent =
        remainder === 0
          ? message(form, 'msg-even', { people: people, each: format(each) })
          : message(form, remainder === 1 ? 'msg-one' : 'msg-many', {
              remainder: remainder,
              people: people,
              high: format(each + 1),
              each: format(each),
            });
    }
  }

  /* ---------- Subscription cost ---------- */

  function subscriptions(form) {
    var rows = form.querySelectorAll('[data-row]');
    var monthly = 0;

    for (var i = 0; i < rows.length; i++) {
      var amount = cents(rows[i].querySelector('[name="amount"]').value);
      var cycle = rows[i].querySelector('[name="cycle"]').value;
      monthly += cycle === 'yearly' ? Math.round(amount / 12) : amount;
    }

    set(form, 'monthly', format(monthly));
    set(form, 'yearly', format(monthly * 12));
    set(form, 'five', format(monthly * 60));
    set(form, 'day', format(Math.round(monthly / 30)));
  }

  function addRow(form, template) {
    if (!template) return;
    var row = template.content.firstElementChild.cloneNode(true);
    var rows = form.querySelector('[data-rows]');
    rows.appendChild(row);
    var first = row.querySelector('input, select');
    if (first) first.focus();
    row.querySelector('[data-remove]').addEventListener('click', function () {
      row.remove();
      subscriptions(form);
    });
  }

  function wire(form) {
    var kind = form.getAttribute('data-calc');
    var run =
      kind === 'budget'
        ? budget
        : kind === 'split'
          ? split
          : kind === 'subscriptions'
            ? subscriptions
            : null;
    if (!run) return;

    run(form);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
    });
    form.addEventListener('input', function () {
      run(form);
    });
    form.addEventListener('change', function () {
      run(form);
    });

    var add = form.querySelector('[data-add]');
    var template = form.querySelector('template[data-template]');
    if (add) {
      add.addEventListener('click', function () {
        addRow(form, template);
        run(form);
      });
    }

    if (kind === 'subscriptions') {
      Array.prototype.forEach.call(form.querySelectorAll('[data-remove]'), function (button) {
        button.addEventListener('click', function () {
          button.closest('[data-row]').remove();
          run(form);
        });
      });
    }
  }

  var forms = document.querySelectorAll('form[data-calc]');
  Array.prototype.forEach.call(forms, wire);
})();
