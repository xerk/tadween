"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const post_activity_1 = require("./activities/post.activity");
const temporal_module_1 = require("../../../libraries/nestjs-libraries/src/temporal/temporal.module");
const database_module_1 = require("../../../libraries/nestjs-libraries/src/database/prisma/database.module");
const autopost_service_1 = require("../../../libraries/nestjs-libraries/src/database/prisma/autopost/autopost.service");
// LOCAL PATCH (upstream PR #1922): register the autopost activity so RSS autoposts run
const autopost_activity_1 = require("./activities/autopost.activity");
const email_activity_1 = require("./activities/email.activity");
const integrations_activity_1 = require("./activities/integrations.activity");
const video_activity_1 = require("./activities/video.activity");
const media_activity_1 = require("./activities/media.activity");
const clipping_activity_1 = require("./activities/clipping.activity");
const video_module_1 = require("../../../libraries/nestjs-libraries/src/videos/video.module");
const health_controller_1 = require("./health.controller");
const activities = [
    post_activity_1.PostActivity,
    autopost_service_1.AutopostService,
    autopost_activity_1.AutopostActivity,
    email_activity_1.EmailActivity,
    integrations_activity_1.IntegrationsActivity,
    video_activity_1.VideoActivity,
    media_activity_1.MediaActivity,
    clipping_activity_1.ClippingActivity,
];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            video_module_1.VideoModule,
            (0, temporal_module_1.getTemporalModule)(true, require.resolve('./workflows'), activities),
        ],
        controllers: [health_controller_1.HealthController],
        providers: [...activities],
        get exports() {
            return [...this.providers, ...this.imports];
        },
    })
], AppModule);
//# sourceMappingURL=app.module.js.map