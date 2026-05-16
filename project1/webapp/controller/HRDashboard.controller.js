sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("com.wipro.project1.controller.HRDashboard", {

        onInit: function () {

            // Load dashboard data from local mock JSON (model/hrDashboardData.json)
            var oModel = new JSONModel();
            // loadData uses a path relative to the application root (webapp)
            var that = this;
            oModel.loadData("model/hrDashboardData.json");
            oModel.attachRequestCompleted(function () {
                that.getView().setModel(oModel);
                // set default selects
                if (that.byId('selectPosition')) { that.byId('selectPosition').setSelectedKey('all'); }
                if (that.byId('selectStatus')) { that.byId('selectStatus').setSelectedKey('all'); }
                // initialize filteredCandidates and KPIs
                that._computeMetrics();
            });
            this.getView().setModel(oModel);

        },

        onRefresh: function () {
            var oModel = this.getView().getModel();
            if (oModel) {
                var that = this;
                oModel.loadData("model/hrDashboardData.json", null, true);
                oModel.attachRequestCompleted(function () {
                    that._computeMetrics();
                    MessageToast.show("Dashboard refreshed");
                });
            }
        },

        onExport: function () {
            var oModel = this.getView().getModel();
            if (!oModel) { MessageToast.show('No data'); return; }
            var aData = oModel.getProperty('/filteredCandidates') || oModel.getProperty('/candidates') || [];
            if (!aData || aData.length === 0) { MessageToast.show('No records to export'); return; }

            var aHeaders = ['name','candidateId','email','position','status','validation','reason','updated'];
            var csv = aHeaders.join(',') + '\n';
            csv += aData.map(function (r) {
                return aHeaders.map(function (h) {
                    var v = r[h] || '';
                    return '"' + String(v).replace(/"/g, '""') + '"';
                }).join(',');
            }).join('\n');

            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.href = url;
            link.download = 'candidates_export.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            MessageToast.show('Exported ' + aData.length + ' record(s)');
        }

        ,_computeMetrics: function () {
            var oModel = this.getView().getModel();
            if (!oModel) { return; }
            var aCandidates = oModel.getProperty('/candidates') || [];

            // initialize filteredCandidates if not present
            if (!oModel.getProperty('/filteredCandidates')) {
                oModel.setProperty('/filteredCandidates', aCandidates.slice());
            }

            var total = aCandidates.length;
            var successfullySubmitted = aCandidates.filter(function (c) {
                return String(c.status || '').toUpperCase() === 'COMPLETED';
            }).length;
            var failed = aCandidates.filter(function (c) {
                var val = String(c.validation || '').toUpperCase();
                var reason = String(c.reason || '').trim();
                return val === 'FAILED' || reason.length > 0;
            }).length;
            var pending = total - successfullySubmitted - failed;

            // statusData aggregation
            var mStatus = {};
            aCandidates.forEach(function (c) { mStatus[c.status] = (mStatus[c.status] || 0) + 1; });
            var aStatusData = Object.keys(mStatus).map(function (k) { return { status: k, count: mStatus[k] }; });

            // failureData aggregation (by reason)
            var mFail = {};
            aCandidates.forEach(function (c) {
                var key = c.reason || (c.validation === 'Failed' ? 'Failed' : null);
                if (key) { mFail[key] = (mFail[key] || 0) + 1; }
            });
            var aFailureData = Object.keys(mFail).map(function (k) { return { reason: k, count: mFail[k] }; });

            // trendData: group by day name from updated field
            var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            var mTrend = { 'Mon':0,'Tue':0,'Wed':0,'Thu':0,'Fri':0,'Sat':0,'Sun':0 };
            aCandidates.forEach(function (c) {
                if (c.updated) {
                    var d = new Date(c.updated);
                    if (!isNaN(d)) { mTrend[dayNames[d.getUTCDay()]] += 1; }
                }
            });
            var aTrendData = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function (d) { return { day: d, count: mTrend[d] || 0 }; });

            oModel.setProperty('/kpi', {
                totalCandidates: total,
                pendingValidation: pending,
                failedValidation: failed,
                successfullySubmitted: successfullySubmitted
            });

            oModel.setProperty('/statusData', aStatusData);
            oModel.setProperty('/failureData', aFailureData);
            oModel.setProperty('/trendData', aTrendData);
        },

        onApplyFilters: function () {
            var oView = this.getView();
            var oModel = oView.getModel();
            var aCandidates = oModel.getProperty('/candidates') || [];

            var sName = this.byId('searchName') && this.byId('searchName').getValue ? this.byId('searchName').getValue() : '';
            var sId = this.byId('inputCandidateId') && this.byId('inputCandidateId').getValue ? this.byId('inputCandidateId').getValue() : '';
            var sEmail = this.byId('inputEmail') && this.byId('inputEmail').getValue ? this.byId('inputEmail').getValue() : '';
            var sPosition = this.byId('selectPosition') && this.byId('selectPosition').getSelectedItem ? (this.byId('selectPosition').getSelectedItem() ? this.byId('selectPosition').getSelectedItem().getText() : '') : '';
            var sStatus = this.byId('selectStatus') && this.byId('selectStatus').getSelectedItem ? (this.byId('selectStatus').getSelectedItem() ? this.byId('selectStatus').getSelectedItem().getText() : '') : '';

            // use selected keys for selects when available
            var oPos = this.byId('selectPosition');
            var sPositionKey = oPos && oPos.getSelectedKey ? oPos.getSelectedKey() : '';
            var oStatus = this.byId('selectStatus');
            var sStatusKey = oStatus && oStatus.getSelectedKey ? oStatus.getSelectedKey() : '';

            var aFiltered = aCandidates.filter(function (c) {
                // Name filter
                if (sName && (!c.name || c.name.toLowerCase().indexOf(sName.toLowerCase()) === -1)) { return false; }
                // ID filter
                if (sId && (!c.candidateId || c.candidateId.toLowerCase().indexOf(sId.toLowerCase()) === -1)) { return false; }
                // Email filter
                if (sEmail && (!c.email || c.email.toLowerCase().indexOf(sEmail.toLowerCase()) === -1)) { return false; }
                // Position filter (AND)
                if (sPositionKey && sPositionKey !== 'all' && c.position !== sPositionKey) { return false; }
                // Status filter (AND)
                if (sStatusKey && sStatusKey !== 'all') {
                    var st = String(c.status || '').toUpperCase();
                    var val = String(c.validation || '').toUpperCase();
                    var reason = String(c.reason || '').trim();
                    if (sStatusKey === 'pending') {
                        // pending = not success and not failed
                        if (st === 'COMPLETED') { return false; }
                        if (val === 'FAILED' || reason.length > 0) { return false; }
                    } else if (sStatusKey === 'success') {
                        if (st !== 'COMPLETED') { return false; }
                    } else if (sStatusKey === 'failed') {
                        if (!(val === 'FAILED' || reason.length > 0)) { return false; }
                    }
                }
                return true;
            });

            oModel.setProperty('/filteredCandidates', aFiltered);
        },

        onClearFilters: function () {
            var oModel = this.getView().getModel();
            // clear UI fields
            if (this.byId('searchName')) { this.byId('searchName').setValue(''); }
            if (this.byId('inputCandidateId')) { this.byId('inputCandidateId').setValue(''); }
            if (this.byId('inputEmail')) { this.byId('inputEmail').setValue(''); }
            if (this.byId('selectPosition')) { this.byId('selectPosition').setSelectedKey('all'); }
            if (this.byId('selectStatus')) { this.byId('selectStatus').setSelectedKey('all'); }

            var aCandidates = oModel.getProperty('/candidates') || [];
            oModel.setProperty('/filteredCandidates', aCandidates.slice());
            this._computeMetrics();
        }

        ,onSendStatusEmail: function (oEvent) {
            var oBtn = oEvent.getSource();
            var oCtx = oBtn.getBindingContext();
            if (!oCtx) { MessageToast.show('No candidate found'); return; }
            var oData = oCtx.getObject();
            var email = oData.email;
            if (!email) { MessageToast.show('Candidate has no email'); return; }

            // fetch('/send-status-email', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ email: email })
            // }).then(function (res) {
            //     if (!res.ok) throw new Error('Send failed');
            //     return res.json();
            // }).then(function (json) {
                MessageToast.show('Email sent');
            // }).catch(function (err) {
            //     MessageToast.show('Email send failed');
            //     console.error(err);
            // });
        }

        ,onCandidateSelect: function (oEvent) {
            const candidateId = oEvent.getSource().getBindingContext().getProperty("candidateId");
            console.log(candidateId);
            this.getOwnerComponent().getRouter().navTo("CandidateDetails", { candidateId });
        }

        ,onCandidateNamePress: function (oEvent) {
            const candidateId = oEvent.getSource().getBindingContext().getProperty("candidateId");
            console.log(candidateId);
            this.getOwnerComponent().getRouter().navTo("candidateDetails", { candidateId });
        }

    });

});