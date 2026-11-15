"""监控中心总览大屏：查询结果变量随内置画布导入保留，并改写成数据源 ID。"""

from pathlib import Path

import yaml

from apps.operation_analysis.constants.import_export import ObjectType
from apps.operation_analysis.management.commands.init_builtin_canvases import (
    MONITOR_CENTER_REGION_SCREEN_YAML_PATH,
    _get_builtin_canvas_file_paths,
    _load_source_api_document,
    _merge_yaml_documents,
)
from apps.operation_analysis.schemas.import_export_schema import YAMLDocument
from apps.operation_analysis.services.import_export.view_sets import rewrite_canvas_view_sets_refs_for_storage

SAMPLE_PATH = Path(MONITOR_CENTER_REGION_SCREEN_YAML_PATH)
INSTANCE_KEY = "CMDB 实例通用查询::cmdb/query_cmdb_instances"
MONITOR_INSTANCE_KEY = "监控实例通用查询::monitor/query_monitor_instances"


def test_region_screen_is_a_builtin_canvas():
    loaded = {Path(path).resolve() for path in _get_builtin_canvas_file_paths()}
    assert SAMPLE_PATH.resolve() in loaded


def test_region_screen_keeps_query_variables_through_import():
    raw = yaml.safe_load(SAMPLE_PATH.read_text(encoding="utf-8"))
    document = YAMLDocument(**raw)
    screen = document.screens[0]
    variables = screen.view_sets["queryVariables"]

    assert [item["id"] for item in variables] == [
        "region-hosts",
        "related-assets",
        "monitored-assets",
    ]
    assert variables[0]["dataSource"] == INSTANCE_KEY
    assert variables[2]["valueField"] == "instance_id"
    assert {item["id"] for item in screen.view_sets["filters"]} == {
        "cloud_region__string",
        "model_asst__string",
    }

    rewritten = rewrite_canvas_view_sets_refs_for_storage(
        screen.view_sets,
        ObjectType.SCREEN,
        {INSTANCE_KEY: 41, MONITOR_INSTANCE_KEY: 42},
    )
    stored = {item["id"]: item["dataSource"] for item in rewritten["queryVariables"]}
    assert stored["region-hosts"] == 41
    assert stored["monitored-assets"] == 42
    assert rewritten["filters"][0]["id"] == "cloud_region__string"


def test_region_screen_refs_exist_in_source_api():
    documents = [_load_source_api_document()]
    documents.append(yaml.safe_load(SAMPLE_PATH.read_text(encoding="utf-8")))
    merged = _merge_yaml_documents(documents)
    document = YAMLDocument(**merged)
    screen = next(item for item in document.screens if item.key == "screen::监控中心总览_内置")
    available = {item.key for item in document.datasources}
    assert set(screen.refs.datasource_keys) <= available
    assert screen.view_sets["queryVariables"][1]["dataSource"] in available
