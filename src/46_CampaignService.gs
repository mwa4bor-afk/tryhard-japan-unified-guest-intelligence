TGI.CampaignService = (function () {
  var CAMPAIGN_SHEET = 'Campaigns';
  var RECIPIENT_SHEET = 'Campaign_Recipients';
  var CAMPAIGN_HEADERS = ['campaign_id','name','integration_id','template_id','criteria_json','status','audience_count','queued_count','skipped_count','created_by','created_at','launched_at'];
  var RECIPIENT_HEADERS = ['recipient_id','campaign_id','guest_id','destination','channel','status','job_id','skip_reason','created_at'];

  function ensure_(name, headers) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
    return sheet;
  }

  function rows_(name, headers) {
    var sheet = ensure_(name, headers);
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().map(function (row, index) {
      var record = { _row: index + 2 };
      headers.forEach(function (header, column) { record[header] = row[column]; });
      return record;
    });
  }

  function create(input) {
    TGI.AccessControlService.requirePermission('marketing.manage');
    input = input || {};
    TGI.Util.assert(input.name, 'Campaign name is required.');
    TGI.Util.assert(TGI.IntegrationRegistryService.find(input.integration_id), 'Integration not found: ' + input.integration_id);
    TGI.Util.assert(TGI.MessageTemplateService.find(input.template_id), 'Template not found: ' + input.template_id);
    var campaign = {
      campaign_id: TGI.Util.id('CMP'), name: input.name, integration_id: input.integration_id,
      template_id: input.template_id, criteria_json: JSON.stringify(input.criteria || {}), status: 'DRAFT',
      audience_count: 0, queued_count: 0, skipped_count: 0,
      created_by: TGI.AccessControlService.currentEmail(), created_at: new Date(), launched_at: ''
    };
    ensure_(CAMPAIGN_SHEET, CAMPAIGN_HEADERS).appendRow(CAMPAIGN_HEADERS.map(function (header) { return campaign[header]; }));
    TGI.AuditLog.write(CAMPAIGN_SHEET, campaign.campaign_id, 'CREATE', { name: campaign.name });
    return campaign;
  }

  function find(campaignId) {
    return rows_(CAMPAIGN_SHEET, CAMPAIGN_HEADERS).filter(function (campaign) { return campaign.campaign_id === campaignId; })[0] || null;
  }

  function launch(campaignId) {
    TGI.AccessControlService.requirePermission('marketing.launch');
    var campaign = find(campaignId);
    TGI.Util.assert(campaign, 'Campaign not found: ' + campaignId);
    TGI.Util.assert(campaign.status === 'DRAFT', 'Only draft campaigns can be launched.');
    var template = TGI.MessageTemplateService.find(campaign.template_id);
    var audience = TGI.AudienceService.build(JSON.parse(campaign.criteria_json || '{}'));
    var queued = 0, skipped = 0;
    var recipientSheet = ensure_(RECIPIENT_SHEET, RECIPIENT_HEADERS);

    audience.guests.forEach(function (guest) {
      var channel = String(template.channel || 'EMAIL').toUpperCase();
      var destination = channel === 'EMAIL' ? guest.email : guest.phone;
      var recipient = {
        recipient_id: TGI.Util.id('RCP'), campaign_id: campaign.campaign_id, guest_id: guest.guest_id,
        destination: destination || '', channel: channel, status: '', job_id: '', skip_reason: '', created_at: new Date()
      };
      if (!destination) {
        recipient.status = 'SKIPPED'; recipient.skip_reason = 'Missing destination'; skipped += 1;
      } else if (String(guest.marketing_consent || '').toUpperCase() !== 'YES') {
        recipient.status = 'SKIPPED'; recipient.skip_reason = 'Marketing consent unavailable'; skipped += 1;
      } else {
        var rendered = TGI.MessageTemplateService.render(template, guest, { campaign_name: campaign.name });
        var payload = {
          campaign_id: campaign.campaign_id, guest_id: guest.guest_id, channel: channel,
          destination: destination, subject: rendered.subject, body: rendered.body,
          language: guest.language || template.language || 'ja'
        };
        var job = TGI.IntegrationQueueService.enqueue(campaign.integration_id, 'campaign.message', payload, {
          entity_type: 'CAMPAIGN_RECIPIENT', entity_id: recipient.recipient_id
        });
        recipient.status = 'QUEUED'; recipient.job_id = job.job_id; queued += 1;
      }
      recipientSheet.appendRow(RECIPIENT_HEADERS.map(function (header) { return recipient[header]; }));
    });

    campaign.status = 'LAUNCHED'; campaign.audience_count = audience.count;
    campaign.queued_count = queued; campaign.skipped_count = skipped; campaign.launched_at = new Date();
    ensure_(CAMPAIGN_SHEET, CAMPAIGN_HEADERS).getRange(campaign._row,1,1,CAMPAIGN_HEADERS.length)
      .setValues([CAMPAIGN_HEADERS.map(function (header) { return campaign[header]; })]);
    TGI.AuditLog.write(CAMPAIGN_SHEET, campaign.campaign_id, 'LAUNCH', { audience: audience.count, queued: queued, skipped: skipped });
    return campaign;
  }

  function summary() {
    var campaigns = rows_(CAMPAIGN_SHEET, CAMPAIGN_HEADERS);
    return {
      campaigns: campaigns.length,
      draft: campaigns.filter(function (c) { return c.status === 'DRAFT'; }).length,
      launched: campaigns.filter(function (c) { return c.status === 'LAUNCHED'; }).length,
      audience: campaigns.reduce(function (sum, c) { return sum + Number(c.audience_count || 0); }, 0),
      queued: campaigns.reduce(function (sum, c) { return sum + Number(c.queued_count || 0); }, 0),
      skipped: campaigns.reduce(function (sum, c) { return sum + Number(c.skipped_count || 0); }, 0)
    };
  }

  return { ensureSheets: function () { ensure_(CAMPAIGN_SHEET,CAMPAIGN_HEADERS); ensure_(RECIPIENT_SHEET,RECIPIENT_HEADERS); }, create: create, find: find, launch: launch, summary: summary };
})();