# Generated by Django 4.2.7 on 2025-04-29 02:55

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('node_mgmt', '0002_collector_controller_default_run'),
    ]

    operations = [
        migrations.AddField(
            model_name='controllertasknode',
            name='status',
            field=models.CharField(default='', max_length=100, verbose_name='任务状态'),
        ),
        migrations.CreateModel(
            name='NodeCollectorInstallStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(max_length=100, verbose_name='状态')),
                ('result', models.JSONField(default=dict, verbose_name='结果')),
                ('collector', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='node_mgmt.collector', verbose_name='采集器')),
                ('node', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='node_mgmt.node', verbose_name='节点')),
            ],
            options={
                'verbose_name': '节点采集器状态',
                'verbose_name_plural': '节点采集器状态',
            },
        ),
    ]
