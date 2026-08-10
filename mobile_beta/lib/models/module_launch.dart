import 'guided_setting.dart';
import 'guided_topic.dart';

class ModuleLaunch {
  final String moduleId;
  final String unitId;
  final String pageId;
  final String moduleTitle;
  final String unitTitle;
  final String pageTitle;
  final String pageInstructions;
  final GuidedTopic topic;
  final GuidedSetting setting;

  const ModuleLaunch({
    required this.moduleId,
    required this.unitId,
    required this.pageId,
    required this.moduleTitle,
    required this.unitTitle,
    required this.pageTitle,
    required this.pageInstructions,
    required this.topic,
    required this.setting,
  });

  factory ModuleLaunch.fromJson(Map<String, dynamic> json) {
    final launch = Map<String, dynamic>.from(json['launch'] as Map? ?? const {});
    final module = Map<String, dynamic>.from(json['module'] as Map? ?? const {});
    final unit = Map<String, dynamic>.from(json['unit'] as Map? ?? const {});
    final page = Map<String, dynamic>.from(json['page'] as Map? ?? const {});
    return ModuleLaunch(
      moduleId: launch['module_id']?.toString() ?? '',
      unitId: launch['unit_id']?.toString() ?? '',
      pageId: launch['page_id']?.toString() ?? '',
      moduleTitle: module['title']?.toString() ?? '',
      unitTitle: unit['title']?.toString() ?? '',
      pageTitle: page['title']?.toString() ?? '',
      pageInstructions: page['instructions']?.toString() ?? '',
      topic: GuidedTopic.fromJson(
        Map<String, dynamic>.from(json['topic'] as Map? ?? const {}),
      ),
      setting: GuidedSetting.fromJson(
        Map<String, dynamic>.from(json['setting'] as Map? ?? const {}),
      ),
    );
  }
}
